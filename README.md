<div align="center">
  <div>
    <img width="500" src="https://res.cloudinary.com/adonisjs/image/upload/q_100/v1532274184/Dimer_Readme_Banner_lyy7wv.svg" alt="Dimer App">
  </div>
  <br>
  <p>
    <a href="https://dimerapp.com/what-is-dimer">
      Dimer is an open source project and CMS to help you publish your documentation online.
    </a>
  </p>
  <br>
  <p>
    <sub>We believe every project/product is incomplete without documentation. <br /> We want to help you publish user facing documentation, without worrying <code>about tools or code</code> to write.</sub>
  </p>
  <br>
</div>

# Dimer Dfile
> Converts the markdown file to vFile

[![travis-image]][travis-url]
[![npm-image]][npm-url]

This module will convert the markdown file by reading it from the disk, and also reports the errors via [vfile](https://github.com/vfile/vfile) interface.

## Installation

```shell
npm i --save-dev @dimerapp/dfile

# yarn
yarn add @dimerapp/dfile
```

## Usage

```js
const Dfile = require('@dimerapp/dfile')

const file = new Dfile(join(__dirname, 'readme.md'))
await file.parse()

if (file.messages) {
  // has errors
}

// JSON AST
file.contents
```

## Computing base name
You can instruct dFile to compute the base name of the file from a given directory by providing the base path

```js
const Dfile = require('@dimerapp/dfile')
const docsDir = join(__dirname, 'docs')
const filePath = join(docsDir, 'getting-started/intro.md')

const file = new Dfile(filePath, docsDir)
console.log(file.baseName) // getting-started/intro.md
```

## API
The following properties/methods are available on the file instance.

#### constructor(filePath, [basePath], [markdownOptions])
```js
new Dfile(filePath, basePath, {
  async onUrl () {
  },
  title: 'Custom title',
  skipToc: false
})
```

#### parse()
Parse the file by reading it from the disk.

```md
const file = new Dfile(join(__dirname, 'readme.md'))
await file.parse()
```

#### fatalMessage(message, ruleId)
Add a new fatal message with rule id

```md
file.fatalMessage('Missing title', 'missing-title')
```

#### warningMessage(message, ruleId)
Add a new warning with rule id

```md
file.warningMessage('Missing title', 'missing-title')
```

#### contents
File JSON AST

```json
file.contents
```

#### messages
File error messages. The messages `fatal` property are hard errors.

```js
file.messages
```

#### fatalMessages
Returns an array of fatal messages.

```js
file.fatalMessages
```

#### warningMessages
Returns an array of warnings.

```js
file.warningMessages
```

#### filePath
File absolute path

```js
file.filePath
```

#### metaData
File yaml front matter meta data

```js
file.metaData
```

#### toJSON()
Returns the JSON representation of the file

```js
file.toJSON()
```

## Change log

The change log can be found in the [CHANGELOG.md](https://github.com/dimerapp/dfile/CHANGELOG.md) file.

## Contributing

Everyone is welcome to contribute. Please take a moment to review the [contributing guidelines](CONTRIBUTING.md).

## Authors & License
[thetutlage](https://github.com/thetutlage) and [contributors](https://github.com/dimerapp/dfile/graphs/contributors).

MIT License, see the included [MIT](LICENSE.md) file.

[travis-image]: https://img.shields.io/travis/dimerapp/dfile/master.svg?style=flat-square&logo=travis
[travis-url]: https://travis-ci.org/dimerapp/dfile "travis"

[npm-image]: https://img.shields.io/npm/v/@dimerapp/dfile.svg?style=flat-square&logo=npm
[npm-url]: https://npmjs.org/package/@dimerapp/dfile "npm"
