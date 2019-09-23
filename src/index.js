// @ts-check

/**
 * @function registerPlugins
 * @description This function is used to add additional properties and methods
 * to the loaded modules. When the module is wrapped with a higher order function
 * that has access to the result of `registerPlugins(cache)` we can register new
 * behaviours and expose a function to clear up any actions applied when the module
 * is destroyed between page views
 * @param {Map} cache The behaviours Map. this is where all of the behaviours are added/edited and removed
 * @return {function}
 */
function registerPlugins(cache) {
	/**
	 * @descrition Register the plugin with the module
	 * this is called each time a module is loaded
	 * @function registerId
	 * @param {string} id
	 * @return {function}
	 */
	return function registerId(id) {
		/**
		 * @description this is called for each plugin, each plugin
		 * is added to the behaviours plugin array.  Each plugin
		 * should provide a cleanup function via the register function
		 * provided to each plugin. This function will be called when
		 * the behaviour is destroyed
		 * @function addPlugins
		 * @param {function} plugin
		 * @return {void}
		 */
		return function addPlugins(plugin) {
			if (cache.has(id)) {
				const item = cache.get(id)
				const { plugins = [] } = item
				cache.set(id, {
					...item,
					plugins: [...plugins, plugin]
				})

				return
			}

			cache.set(id, {
				name: id,
				plugins: [plugin]
			})
		}
	}
}

/**
 * @function renderInTheLoop
 * @description call the function at the end of the event loop (i think!)
 * @param {function} callback
 * @return {void}
 */
export function renderInTheLoop(callback) {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => callback())
	})
}

export const cache = new Map()

/**
 * create a registerPlugin function with the cache.
 * this is used to manage extra functionality added
 * to modules via the withPlugins or connect high
 * order functions from @spon/plugins and @spon/connect
 * respectively
 *
 * @public
 * @type {Object}
 */
export const registerPlugin = registerPlugins(cache)

/**
 * @function loadModule
 * @description this function is used by the loadApp function for each data-behaviour
 * it can also be used on it's own to load modules directly, without data-behaviour
 * attributes or code splitting
 * @example
 *
 * import { loadModule } from '@spon/core'
 * import logger from './behaviours/logger'
 *
 * // load from file
 * loadModule({
 * 	module: logger, // required
 * 	id: 'hello', // required
 * 	node: document.getElementById('logger') // default undefined,
 * 	keepAlive: true // default undefined
 * })
 *
 * @param {Object} props
 * @property {Function} props.module
 * @property {string} props.id
 * @property {bool} props.keepAlive
 * @property {HTMLElement} props.node
 * @return {void}
 */
export function loadModule({ module, id, keepAlive, node, ...props }) {
	registerPlugin(id)
	const fn = module({ node, name: id, ...props })
	cache.set(id, {
		...cache.get(id),
		keepAlive,
		destroy: fn,
		hasLoaded: true
	})
}

export function unLoadModule(id) {
	const { destroy } = cache.get(id)
	if (destroy) destroy()
	cache.delete(id)
}

/**
 * @typedef {Object} App
 * @property {function} hydrate finds modules and calls them
 * @property {function} destroy destroys any valid modules
 * @property {Map} cache a cache of behaviours
 */

/**
 * @function loadApp
 * @description this function is used to dynamically load data-behaviour
 * modules asynchronous with code splitting.
 * @example
 *
 * import { loadApp } from '@spon/core'
 *
 * loadApp(name => import(`./behaviours/${name}`), document.body)
 *
 * @param {Function} moduleLoader the dynamic import function
 * @param {HTMLElement} context the root html element to query from
 * @return {App}
 */
export function loadApp(moduleLoader, context) {
	/**
	 *
	 * @param {object} props
	 * @property {string} props.behaviour the js file to load
	 * @property {string} props.id the behaviour id
	 * @property {bool} props.keepAlive should the module be destroyed between page views
	 * @property {HTMLElement} props.node the html element to load the element against
	 * @return {void}
	 */
	function fetchBehaviour({ behaviour, id, keepAlive, node }) {
		moduleLoader(behaviour).then(resp => {
			const { default: module } = resp
			loadModule({ module, id, keepAlive, node })
		})
	}

	/**
	 * @function hydrate
	 * @description query the dom for elements attrubtes with a data-behaviour attribute
	 * Get the value... check to see if there is a query attribute, if so wait for the query
	 * to be valid and then fetch, if not, fetch the file with the matching name and load
	 * the behaviour.  Add the items to the cache. And yup
	 * @param {HTMLElement} context the node to query from
	 * @return {void}
	 */
	function hydrate(context) {
		renderInTheLoop(() => {
			;[...context.querySelectorAll('*[data-behaviour]')]
				.filter(({ id }) => !cache.has(id))
				.forEach(node => {
					// @ts-ignore
					const { behaviour: tmpBehaviour, query, keepAlive } = node.dataset
					const id = node.id
					const behaviour = tmpBehaviour.trim()
					const props = { behaviour, id, keepAlive, node }

					if (behaviour.split(' ').length > 1 || !id) {
						throw new Error(
							`error at: ${behaviour}, Only one behaviour is allowed per node. Each node must have a unique id`
						)
					}

					// add the item to the cache.
					cache.set(id, {
						name: id,
						hasLoaded: false
					})

					// if there is a data-query attribute
					if (query) {
						const mql = window.matchMedia(query)
						// does it already match
						if (mql.matches) {
							// load the behaviour
							fetchBehaviour(props)
						}

						// the matchMedia event handle. we need to store
						// a reference to the function so we can remove
						// when unmounting
						const handle = ({ matches }) => {
							const item = cache.get(id)
							if (!matches && item.hasLoaded) {
								const { destroy, plugins = [], ...rest } = item
								;[destroy, ...plugins].forEach(fn => {
									if (typeof fn === 'function') fn()
								})
								cache.set(id, { ...rest, hasLoaded: false })
							} else if (matches && !item.hasLoaded) {
								fetchBehaviour(props)
							}
						}

						mql.addListener(handle)

						// add the mql and handle to the cache
						cache.set(id, {
							...cache.get(id),
							query: {
								mql,
								handle
							}
						})
					} else {
						fetchBehaviour(props)
					}
				})
		})
	}

	/**
	 * @function destroy
	 * @description loops through the cache, destroying any modules on the killList
	 * @returns {void}
	 */
	function destroy() {
		cache.forEach(({ name, keepAlive, query, destroy, plugins = [] }) => {
			if (typeof keepAlive === 'undefined') {
				if (query) {
					const { mql, handle } = query
					mql.removeListener(handle)
				}
				;[destroy, ...plugins]
					.filter(fn => typeof fn === 'function')
					.map(fn => fn())
				cache.delete(name)
			}
		})
	}

	hydrate(context)

	return {
		hydrate,
		destroy,
		cache
	}
}
