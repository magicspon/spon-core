// @ts-check

/**
 * @function registerPlugins
 * @param {Map} cache
 * @return {function}
 */
function registerPlugins(cache) {
	/**
	 * @function setCacheKey
	 * @param {string} id
	 * @return {function}
	 */
	return function setCacheKey(id) {
		/**
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
 * @param {function} callback
 * @return {void}
 */
function renderInTheLoop(callback) {
	requestAnimationFrame(() => {
		requestAnimationFrame(() => callback())
	})
}

const cache = new Map()

/**
 * return a registerPlugin function, this is used to
 * add plugins to the cache
 *
 * @public
 * @type {Object}
 */
export const registerPlugin = registerPlugins(cache)

/**
 * @function loadModule
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

/**
 * @typedef {Object} App
 * @property {function} hydrate finds modules and calls them
 * @property {function} destroy destroys any valid modules
 * @property {Map} cache a cache of behaviours
 */

/**
 * @function loadApp
 * @namespace loadApp
 * @param {Function} moduleLoader the dynamic import function
 * @param {HTMLElement} context the root html element to query from
 * @return {App}
 */
export function loadApp(moduleLoader, context) {
	function fetchBehaviour({ behaviour, id, keepAlive, node }) {
		moduleLoader(behaviour).then(resp => {
			const { default: module } = resp
			loadModule({ module, id, keepAlive, node })
		})
	}

	/**
	 * @function hydrate
	 * @description queries the given context for elements with data-behaviour attributes
	 * any matches are added to the cache.
	 * the scan function is then called, as well as a window resize event is added
	 * which also calls the scan function
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

					cache.set(id, {
						name: id,
						hasLoaded: false
					})

					if (query) {
						const mql = window.matchMedia(query)
						if (mql.matches) {
							fetchBehaviour(props)
						}

						const handle = ({ matches }) => {
							const item = cache.get(id)
							if (!matches && item.hasLoaded === true) {
								const { destroy, plugins = [], ...rest } = item
								;[destroy, ...plugins].forEach(fn => {
									if (typeof fn === 'function') fn()
								})
								cache.set(id, { ...rest, hasLoaded: false })
							} else if (matches && item.hasLoaded === false) {
								fetchBehaviour(props)
							}
						}

						mql.addListener(handle)

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
