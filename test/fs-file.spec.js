/*
* fs-client
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

const test = require('japa')
const { join } = require('path')
const fs = require('fs-extra')
const dedent = require('dedent')

const File = require('../src/File')
const sampleFile = join(__dirname, 'foo.md')

test.group('File', (group) => {
  group.afterEach(async () => {
    await fs.remove(sampleFile)
  })

  test('return error when file is empty', async (assert) => {
    await fs.writeFile(sampleFile, '')
    const file = new File(sampleFile)

    await file.parse()
    assert.equal(file.messages[0].message, 'Empty file')
    assert.equal(file.messages[0].ruleId, 'empty-file')
    assert.isTrue(file.messages[0].fatal)
  })

  test('generate permalink from file path when yaml matter is missing', async (assert) => {
    await fs.writeFile(sampleFile, dedent`
    Hello world
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.deepEqual(file.metaData, { permalink: 'foo', title: '' })
  })

  test('generate permalink from file path when yaml matter is empty', async (assert) => {
    await fs.writeFile(sampleFile, dedent`---
    ---

    Hello world
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.deepEqual(file.metaData, { permalink: 'foo', title: '' })
  })

  test('patch content with spaces when has empty yaml frontmatter', async (assert) => {
    const file = new File(sampleFile)
    const { content } = file._readYamlFrontMatter(dedent`---
    ---

    Hello world
    `)

    assert.deepEqual(content.split('\n'), ['', '', '', 'Hello world'])
  })

  test('patch content with spaces when has yaml frontmatter', async (assert) => {
    const file = new File(sampleFile)
    const { content } = file._readYamlFrontMatter(dedent`---
    permalink: /foo
    ---

    Hello world
    `)

    assert.deepEqual(content.split('\n'), ['', '', '', '', 'Hello world'])
  })

  test('do not patch content with spaces when there is no yaml frontmatter', async (assert) => {
    const file = new File(sampleFile)
    const { content } = file._readYamlFrontMatter(dedent`Hello world`)

    assert.deepEqual(content.split('\n'), ['Hello world'])
  })

  test('set processed content when everything is good', async (assert) => {
    await fs.writeFile(sampleFile, dedent`---
    permalink: /hello
    ---

    Hello world
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.deepEqual(file.contents, {
      type: 'root',
      children: [
        {
          type: 'element',
          tag: 'p',
          props: {},
          children: [{ type: 'text', value: 'Hello world' }]
        }
      ]
    })
  })

  test('consume vFile error messages', async (assert) => {
    await fs.writeFile(sampleFile, dedent`---
    permalink: /hello
    ---

    [note]
    Hello
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.equal(file.messages[0].message, 'Unclosed macro: note')
    assert.deepEqual(file.messages[0].location, {
      start: {
        line: 5,
        column: 1,
        offset: 4
      },
      end: {
        line: null,
        column: null
      }
    })
  })

  test('set meta data title', async (assert) => {
    await fs.writeFile(sampleFile, dedent`---
    permalink: /hello
    ---

    [note]
    Hello
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.equal(file.messages[0].message, 'Unclosed macro: note')
    assert.deepEqual(file.messages[0].location, {
      start: {
        line: 5,
        column: 1,
        offset: 4
      },
      end: {
        line: null,
        column: null
      }
    })
  })

  test('return JSON representation of file', async (assert) => {
    await fs.writeFile(sampleFile, dedent`---
    permalink: /hello
    ---

    [note]
    Hello
    `)

    const file = new File(sampleFile)
    await file.parse()

    const json = file.toJSON()
    assert.hasAllKeys(json, ['contents', 'fatalMessages', 'warningMessages', 'metaData', 'filePath', 'baseName'])
  })

  test('return base name for the file when base path exists', async (assert) => {
    const basePath = join(__dirname, 'docs')
    const filePath = join(basePath, 'foo/bar.md')

    await fs.outputFile(filePath, dedent`---
    permalink: /hello
    ---

    [note]
    Hello
    `)

    const file = new File(filePath, basePath)
    assert.equal(file.baseName, 'foo/bar.md')

    await fs.remove(basePath)
  })

  test('set error when permalink is invalid', async (assert) => {
    const basePath = join(__dirname, 'docs')
    const filePath = join(basePath, 'foo/bar.md')

    await fs.outputFile(filePath, dedent`---
    permalink: foo bar
    ---

    [note]
    Hello
    `)

    const file = new File(filePath, basePath)
    await file.parse()

    assert.deepEqual(file.fatalMessages[0].message, 'Unallowed characters detected in permalink')
    assert.deepEqual(file.fatalMessages[0].ruleId, 'bad-permalink')

    await fs.remove(basePath)
  })

  test('set error when title is missing', async (assert) => {
    const basePath = join(__dirname, 'docs')
    const filePath = join(basePath, 'foo/bar.md')

    await fs.outputFile(filePath, dedent`---
    ---

    Hello
    `)

    const file = new File(filePath, basePath)
    await file.parse()

    assert.deepEqual(file.fatalMessages[0].message, 'Missing title', 'missing-title')

    await fs.remove(basePath)
  })
})
