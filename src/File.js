/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const fs = require('fs-extra')
const Markdown = require('@dimerapp/markdown')
const matter = require('gray-matter')
const utils = require('@dimerapp/utils')
const vFile = require('vfile')
const { sep, basename } = require('path')

/**
 * A single file to be processed.
 *
 * @class File
 *
 * @param {String} filePath
 * @param {String} basePath
 */
class File {
  constructor (filePath, basePath) {
    this.metaData = null
    this.basePath = basePath
    this.vfile = vFile({ path: filePath, contents: '' })
  }

  /**
   * Returns the base name for the file, only when `basepath`
   * exists
   *
   * @method baseName
   *
   * @return {String}
   */
  get baseName () {
    return this.basePath ? this.filePath.replace(`${this.basePath}${sep}`, '').replace(sep, '/') : null
  }

  /**
   * An array of error messages
   *
   * @attribute messages
   *
   * @return {Array}
   */
  get messages () {
    return this.vfile.messages
  }

  /**
   * The file path
   *
   * @attribute filePath
   *
   * @return {String}
   */
  get filePath () {
    return this.vfile.path
  }

  /**
   * File contents
   *
   * @attribute contents
   *
   * @return {Object}
   */
  get contents () {
    return this.vfile.contents
  }

  /**
   * Returns an array of fatal messages
   *
   * @attribute fatalMessages
   *
   * @return {Array}
   */
  get fatalMessages () {
    return this.messages.filter((message) => message.fatal)
  }

  /**
   * Returns an array of warnings
   *
   * @attribute warningMessages
   *
   * @return {Array}
   */
  get warningMessages () {
    return this.messages.filter((message) => !message.fatal)
  }

  /**
   * Returns the permalink for a given file. If explicit
   * permalink exists, it will be used, otherwise filename
   * is used to create the permalink
   *
   * @method _getPermalink
   *
   * @param  {String}      permalink
   *
   * @return {String}
   *
   * @private
   */
  _getPermalink (permalink) {
    if (permalink) {
      return permalink
    }

    const baseName = basename(this.filePath)
    return utils.permalink.generateFromFileName(baseName)
  }

  /**
   * We need to subsitute the yaml front matter area with
   * empty spaces, so that the Markdown parses generates
   * errors and warnings on correct line numbers
   *
   * @method _patchContentLines
   *
   * @param  {String}           content
   * @param  {String}           raw
   * @param  {Boolean}          isEmpty
   *
   * @return {String}
   *
   * @private
   */
  _patchContentLines (content, raw, isEmpty) {
    if (!raw && !isEmpty) {
      return content
    }

    if (!raw && isEmpty) {
      return `${new Array(3).join('\n')}${content}`
    }

    return `${new Array(raw.split(/\r?\n/).length + 2).join('\n')}${content}`
  }

  /**
   * Parses the file content safely to read the yaml front matter
   * and then return the actual markdown content from it.
   *
   * @method _readYamlFrontMatter
   *
   * @param  {String}             fileContents
   *
   * @return {Object}
   *
   * @private
   */
  _readYamlFrontMatter (fileContents) {
    if (!fileContents.trim()) {
      const message = this.vfile.message('Cannot publish empty file')
      message.fatal = true
      return
    }

    const { data, content, matter: raw, isEmpty } = matter(fileContents, { excerpt: false })
    data.permalink = this._getPermalink(data.permalink)

    try {
      utils.permalink.validate(data.permalink)
    } catch (error) {
      const message = this.vfile.message(error.message)
      message.fatal = true
      return
    }

    return {
      metaData: data,
      content: this._patchContentLines(content, raw, isEmpty)
    }
  }

  /**
   * Parses the file and will also report for errors
   * messages.
   *
   * @method parse
   *
   * @return {void}
   */
  async parse () {
    const fileContents = await fs.readFile(this.filePath, 'utf-8')
    const parsed = this._readYamlFrontMatter(fileContents)

    if (!parsed) {
      return
    }

    this.metaData = parsed.metaData
    this.vfile.contents = parsed.content

    await (new Markdown(this.vfile, {
      title: this.metaData.title,
      skipToc: this.metaData.toc === false
    })).toJSON()
  }

  /**
   * Returns the JSON representation of file
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    return {
      contents: this.contents,
      filePath: this.filePath,
      metaData: this.metaData,
      fatalMessages: this.fatalMessages,
      baseName: this.baseName,
      warningMessages: this.warningMessages
    }
  }
}

module.exports = File
