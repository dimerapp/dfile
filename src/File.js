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
const { EOL } = require('os')
const matter = require('gray-matter')
const slugify = require('slugify')
const vFile = require('vfile')
const { extname, sep, basename } = require('path')

/**
 * A single file to be processed.
 *
 * @class File
 *
 * @param {String} filePath
 */
class File {
  constructor (filePath) {
    this.metaData = null
    this.vfile = vFile({ path: filePath, contents: '' })
  }

  /**
   * An array of error messages
   *
   * @method messages
   *
   * @return {Array}
   */
  get messages () {
    return this.vfile.messages
  }

  /**
   * The file path
   *
   * @method filePath
   *
   * @return {String}
   */
  get filePath () {
    return this.vfile.path
  }

  /**
   * File contents
   *
   * @method contents
   *
   * @return {Object}
   */
  get contents () {
    return this.vfile.contents
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
    return slugify(baseName.replace(sep, '-').replace(new RegExp(`${extname(baseName)}$`), ''), {
      lower: true
    })
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
      return `${new Array(3).join(EOL)}${content}`
    }

    return `${new Array(raw.split(EOL).length + 2).join(EOL)}${content}`
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
}

module.exports = File
