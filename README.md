## @spon/core

## Using version 1.x

There are breaking changes between 2x and 1x. Please see the v1 branch for v1 docs.

2x has a smaller scope than 1x. `withPlugins` and `eventBus` has been moved to `@spon/plugins` and
`connect` has been moved to `@spon/connect`. Refs, createNode, and addEventPromise have been removed
from version 2x

## Installation

`npm install @spon/core` or `yarn add @spon/core`

`@spon/core` is a little framework used to asynchronous load javascript modules based on dom attributes.

## Getting started

Add the following code to your main javascript entry point (app.js)

```javascript
import { loadApp, loadModule } from '@spon/core'
import logger from './behaviours/logger'

// load from data-behaviours
loadApp(name => import(`./behaviours/${name}`), document.body)

// load from file
loadModule({
	module: logger, // required
	id: 'hello', // required
	node: document.getElementById('logger') // default undefined,
	keepAlive: true // default undefined
})
```

Create a html file with the following snippet

```html
<div data-behaviour="example" id="required-id">...</div>
```

`js/behaviours/example`

```javascript
/**
 * @function example
 * @param {Object} props
 * @property {HTMLElement} props.node
 * @return {Function} a function to unmount
 */
function example({ node }) {
	return () => {
		console.log('i am called when the module is destroyed')
	}
}

export default example
```

You can also set the module to only load at certain breakpoints:

```html
<div data-behaviour="example" id="required-id" data-query="(max-width: 1024px)">
	...
</div>
```

`example()` will only be called when the viewport is smaller than 1024px. Once the module is mounted and the viewport increases to greater than 1024 the returned function will be called. Use this to remove any event listeners or destroy any custom modules

```javascript
/**
 * @function example
 * @param {Object} props
 * @property {HTMLElement} props.node
 * @return {Function} a function to unmount
 */
function example({ node }) {
	const slide = new SomeSlideLibrary(node)

	return () => {
		slide.destroy()
	}
}

export default example
```

Behaviours with the 'data-keep-alive' attribute will not be destroyed when navigating betweeen pages. This is only valid if you are using ajax pagaination.

## Usage with @spon/plugins and/or @spon/connect

Example:

```javascript
import { connect } from '@/store'
import { domEvents, withPlugins } from '@spon/plugins'

/* eslint-disable no-console */
function counter({ node, name, plugins: { addEvents }, store, render }) {
	addEvents({
		'click button': () => {
			store.increment(1)
		}
	})

	render(
		({ current }) => {
			node.textContent = current.count
		},
		['count']
	)

	return () => {
		console.log(`destroy: ${name}`)
	}
}

const mapState = store => {
	return {
		count: store.count
	}
}
const mapDispatch = ({ count }) => ({ ...count })

export default withPlugins(domEvents)(
	connect({ mapState, mapDispatch })(counter)
)
```

### Just plugins

```javascript
export default withPlugins(domEvents)(counter)
```

### Just connect

```javascript
export default connect(domEvents)(counter)
```
