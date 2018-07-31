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
  constructor (filePath, basePath, markdownOptions) {
    this.metaData = null
    this.basePath = basePath
    this.markdownOptions = markdownOptions
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
      this.fatalMessage('Empty file', 'empty-file')
      return
    }

    const { data, content, matter: raw, isEmpty } = matter(fileContents, { excerpt: false })
    data.permalink = this._getPermalink(data.permalink)

    try {
      utils.permalink.validate(data.permalink)
    } catch (error) {
      this.fatalMessage(error.message, error.ruleId)
      return
    }

    return {
      metaData: data,
      content: this._patchContentLines(content, raw, isEmpty)
    }
  }

  /**
   * Returns the title node from the content nodes
   *
   * @method _getTitle
   *
   * @param  {Array}  options.children
   *
   * @return {String}
   *
   * @private
   */
  _getTitle ({ children }) {
    const node = children.find((child) => child.tag === 'dimertitle')
    return node ? node.children[0].value : ''
  }

  /**
   * Adds a new fatal message
   *
   * @method fatalMessage
   *
   * @param  {String}         text
   * @param  {String}         ruleId
   */
  fatalMessage (text, ruleId) {
    const message = this.vfile.message(text)
    message.ruleId = ruleId
    message.fatal = true
  }

  /**
   * Adds a warning message to the list of file
   * messages
   *
   * @method warningMessage
   *
   * @param  {String}       text
   * @param  {String}       ruleId
   *
   * @return {void}
   */
  warningMessage (text, ruleId) {
    const message = this.vfile.message(text)
    message.ruleId = ruleId
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

    await (new Markdown(this.vfile, Object.assign({
      title: this.metaData.title,
      skipToc: this.metaData.toc === false
    }, this.markdownOptions))).toJSON()

    /**
     * Set title by reading the node from JSON if title in
     * metaData is missing
     */
    this.metaData.title = this.metaData.title || this._getTitle(this.vfile.contents)

    /**
     * Add fatal error if title is missing
     */
    if (!this.metaData.title) {
      this.fatalMessage('Missing title', 'missing-title')
    }
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
