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
const { EOL } = require('os')

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
    assert.equal(file.messages[0].message, 'Cannot publish empty file')
    assert.isTrue(file.messages[0].fatal)
  })

  test('generate permalink from file path when yaml matter is missing', async (assert) => {
    await fs.writeFile(sampleFile, dedent`
    Hello world
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.deepEqual(file.metaData, { permalink: 'foo' })
  })

  test('generate permalink from file path when yaml matter is empty', async (assert) => {
    await fs.writeFile(sampleFile, dedent`---
    ---

    Hello world
    `)

    const file = new File(sampleFile)
    await file.parse()

    assert.deepEqual(file.metaData, { permalink: 'foo' })
  })

  test('patch content with spaces when has empty yaml frontmatter', async (assert) => {
    const file = new File(sampleFile)
    const { content } = file._readYamlFrontMatter(dedent`---
    ---

    Hello world
    `)

    assert.deepEqual(content.split(EOL), ['', '', '', 'Hello world'])
  })

  test('patch content with spaces when has yaml frontmatter', async (assert) => {
    const file = new File(sampleFile)
    const { content } = file._readYamlFrontMatter(dedent`---
    permalink: /foo
    ---

    Hello world
    `)

    assert.deepEqual(content.split(EOL), ['', '', '', '', 'Hello world'])
  })

  test('do not patch content with spaces when there is no yaml frontmatter', async (assert) => {
    const file = new File(sampleFile)
    const { content } = file._readYamlFrontMatter(dedent`Hello world`)

    assert.deepEqual(content.split(EOL), ['Hello world'])
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
})
