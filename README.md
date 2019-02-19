Work in progress

This has not been used in production...

There are some tests, could do with more.

Demo: [spon.ui](https://sponjs.netlify.com/components/preview/sandbox)

Source: [spon-ui/src/js at master · magicspon/spon-ui · GitHub](https://github.com/magicspon/spon-ui/tree/master/src/js)

# spon.js

spon.js is a light weight framework for loading javascript modules on traditional server rendered websites. It provides fluid page transitions, a delegated event system and a simple plugin system for extending behaviours. At its root, spon.js takes a DOM node with a `data-spon="example"` attribute, and loads a corresponding javascript module. All modules are single chunks that are asynchronous loaded.

## Install

`yarn add @spon/core`

or

`npm install @spon/core --save`

all the things!

```javascript
export {
	loadApp,
	cache,
	registerPlugin,
	router,
	connect,
	refs,
	withRefs,
	createNode,
	eventBus,
	domEvents,
	withDomEvents
} from '@spon/core'
```

## Getting Started

Write some html.

```html
<div data-spon="example">hello</div>
```

Import `loadApp` into your main javascript file

```javascript
import { loadApp } from '@spon/core'
```

Now call the function, passing in the root node, typically this would be `document.body`

The seconard argument is the options object. The only property is fetch. This function should
return a dyanmically imported module

```javascript
import { loadApp } from '@spon/core'

const app = loadApp(document.body, {
	fetch: name => import(`/behaviours/${name}`)
})
```

Add a new file to your `/behaviours/`directory called ‘example.js’

example.js

```javascript
export default function() {}
```

With that all setup, you can now start using spon.js

Each module receives a props object. Without any additional code, each module will have one props property, the dom node that it was mounted against.

```javascript
export default function(props) {
	const node = props.node
}
```

It’s 2019… let’s write modern js.

Better!

```javascript
export default function({ node }) {
	node.classList.add('is-hugh-honme')
}
```

## Dom Events

```html
<div data-spon="example">
	<button type="button" data-toggle-button>Toggle</button>
</div>
```

```javascript
import { withDomEvents, withPlugins } from '@spon/core'

function example({ node, addEvents }) {
	node.classList.add('is-hugh-honme')

	addEvents({
		'click [data-toggle-button]': (e, elm) => {
			e.preventDefault()
			elm.classList.toggle('is-active')
		}
	})
}

export default withPlugins(withDomEvents)(example)
```

`withDomEvents` adds event delegation to the module.

‘event selector`: function

All events, by default are delegated to the node element. If you want to delegate to a different element, you can pass in a Dom node as the first argument , eg

```javascript
addEvents(document.body, {
	'click [data-toggle-button]': (e, elm) => {
		e.preventDefault()
		elm.classList.toggle('is-active')
	}
})
```

## Refs

No… not react… I just like the name, seemed suitable

```html
<div data-spon="example">
	<button type="button" data-toggle-button>Toggle</button>
	<!-- add a couple of nodes with unique data-ref props -->
	<p class="item" data-ref="product" data-id="10">Woffles</p>
	<div data-ref="price" data-cost="2">Woffles</div>
</div>
```

```javascript
import { connect } from './store'
import { withDomEvents, withRefs, withPlugins } from '@spon/core'

function example({ node, addEvents, refs }) {
	node.classList.add('is-hugh-honme')

	const { product, price } = refs
	// get values
	const id = product.data.id
	const cost = price.data.cost

	if (window._DANGER_MODE_) {
		// set values
		price.data.cost += 10
	}

	// performantly set styles to avoid layout thrashing
	product.style.set({ x: 100, color: 'green' })

	// update the className... this doesn't remove any existing
	// classes, it only adds/removes new classes
	product.className = 'waffle'
	// className === 'item waffle'

	// remove waffle
	product.className = ''
	// className === 'item'

	// access the dom node
	product.node.textContent = 'Word'

	addEvents({
		'click [data-toggle-button]': (e, elm) => {
			e.preventDefault()
			elm.classList.toggle('is-active')
		}
	})
}

export default withPlugins(withDomEvents, withRefs)(example)
```

## Rematch (redux)

You’ll need to know how to use rematch to use this feature. Spon.js exposes a hook for subscribing to store updates. It uses the connect function to bind the store state and reducers to the module

store/index.js

```javascript
import { init } from '@rematch/core'
import createRematchPersist from '@rematch/persist'
import { connectStore } from '@/core'
import * as models from './models/index'

const persistPlugin = createRematchPersist({
	whitelist: ['cart'],
	throttle: 1000,
	version: 1
})

const store = init({
	models: {
		...models
	},
	plugins: [persistPlugin]
})

export const connect = connectStore(store)

export default store
```

Standard rematch code…. Back to our module.

```javascript
import { connect } from './store'
import { withDomEvents, withRefs, withPlugins } from '@spon/core'

// removed other code for brevity
function example({ node, addEvents, refs, store, render }) {
	// this function will be called every time
	// the objects returned from the mapState
	// function change
	render(({ prevState, currentState }) => {
		// code written here should only
		// react to changes
		// you shouldn't be quering the dom
		// or making ajax requests
		// this is reactive code only!
	})
}

// get the cart state
const mapState = store => {
	return {
		cart: store.cart
	}
}
// get all of the cart actions
// note: I could have written the function above like this
const mapDispatch = ({ cart }) => ({ ...cart })

export default withPlugins(withRefs, withDomEvents)(
	connect({
		mapState,
		mapDispatch
	})(basket)
)
```

So… we could make a little basket app
All of the logic is handed via the rematch cart model
The module only needs to respond to changes

In this example I’m using `lit-html` to handle dom updates.

```javascript
import { render as h, html } from 'lit-html'
import { withRefs, withDomEvents } from '@spon/core'
import { connect } from './store'

function basket(props) {
	const {
		plugins: { addEvents, refs },
		store: { deleteItemFromCart },
		render
	} = props
	const { list } = refs

	addEvents({
		'click [data-basket-item]': (e, elm) => {
			e.preventDefault()
			const { id } = elm.dataset
			deleteItemFromCart(id)
		}
	})

	render(({ current }) => {
		const { cart } = current
		const { basket } = cart
		const items = Object.values(basket)
		const total = items.reduce((acc, { quantity }) => acc + quantity, 0)

		const basketList = items.map(
			item => html`
				<div
					style="transition-duration: 1000ms"
					class="flex trans"
					data-flip-key="${item.id}"
				>
					<div class="mr-2" data-basket-item data-id="${item.id}">
						${item.title} x${item.quantity}
					</div>
					<button data-basket-item data-id="${item.id}">
						Remove
					</button>
				</div>
			`
		)

		h(
			html`
				<h1>${items.length} - ${total}</h1>
				<div>${basketList}</div>
			`,
			list.node
		)
	})
}

// // get the cart state
const mapState = ({ cart }) => ({ cart })
// get all of the cart actions
const mapDispatch = ({ cart }) => ({ ...cart })
// export the component wrapped with store values
// and any custom plugins
export default withPlugins(withRefs, withDomEvents)(
	connect({
		mapState,
		mapDispatch
	})(basket)
)
```

## Router

With zero config you get super quick page loads. Pages are prefetched during idle time with using [GitHub - GoogleChromeLabs/quicklink: ⚡️Faster subsequent page-loads by prefetching in-viewport links during idle time](https://github.com/GoogleChromeLabs/quicklink)

You can create custom transtions by either giving a value to the data-route node or by using the url of the page.

```html
<div id="page-wrapper">
	<div data-route="my-route">
		... stuff
	</div>
</div>
```

```javascript
import myRoute from './somewhre'

const { routes } = app.plugins

routes.add('my-route', myRoute)
```

```javascript
export default function myRoute() {
	return {
		container: createNode(document.getElementById('page-wrapper')),

		async onExit({ update, prevHtml }) {
			// so stuff
			await update(next => {
				prevHtml.node.parentNode.removeChild(prevHtml.node)
				// call next when you're done
				next()
			})
		},

		async onEnter({ update, newHtml }) {
			const { node } = newHtml

			this.container.node.appendChild(node)

			// call next when you're done
			await update(next => next())
		}
	}
}
```
