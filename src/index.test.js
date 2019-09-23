// import { wait } from '@testing-library/dom'
import { wait } from '@testing-library/dom'
import {
	cache,
	registerPlugin,
	renderInTheLoop,
	loadModule,
	unLoadModule,
	loadApp
} from './index'

describe('test loadApp', () => {
	const fns = {
		sandbox: jest.fn(() => () => {}),
		responsive: jest.fn(() => () => {})
	}

	const mockLoader = name => {
		return Promise.resolve({ default: fns[name]() })
	}

	beforeAll(() => {
		window.resizeTo = function resizeTo(width, height) {
			Object.assign(this, {
				innerWidth: width,
				innerHeight: height,
				outerWidth: width,
				outerHeight: height
			}).dispatchEvent(new this.Event('resize'))
		}

		window.resizeTo(320, 700)
	})

	beforeEach(() => {
		cache.clear()
		jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => cb())
	})

	afterEach(() => {
		window.requestAnimationFrame.mockRestore()
	})

	document.body.innerHTML = `<div id="root">
															<div id="a" data-behaviour="sandbox"></div>
															<div id="b" data-behaviour="responsive" data-query="(min-width: 1000px)"></div>
														</div>`

	it('should export a register plugin function', () => {
		expect(registerPlugin).toBeInstanceOf(Function)
	})

	it('should add plugins to the cache', () => {
		const addPlugin = registerPlugin('a')
		addPlugin({ name: 'expander' })
		addPlugin({ name: 'modal' })

		const item = cache.get('a')
		expect(cache.has('a')).toBe(true)

		expect(item).toMatchObject({
			name: 'a',
			plugins: [{ name: 'expander' }, { name: 'modal' }]
		})
	})

	it('should call the function passed to the renderInTheLoop', () => {
		const fn = jest.fn(() => {})
		renderInTheLoop(fn)
		expect(fn).toHaveBeenCalledTimes(1)
	})

	it('should call manually loaded modules', () => {
		const mod = jest.fn()
		const node = document.getElementById('a')

		loadModule({
			name: 'waffle',
			module: mod,
			node,
			keepAlive: true,
			id: 'Module'
		})

		expect(mod).toHaveBeenCalledTimes(1)
		expect(mod).toHaveBeenCalledWith({
			name: 'waffle',
			node
		})

		const item = cache.get('Module')
		expect(cache.has('Module')).toBe(true)
		expect(cache.size).toBe(1)

		expect(item).toMatchObject({
			hasLoaded: true,
			keepAlive: true,
			destroy: mod()
		})
	})

	it('should unload any manually added items', () => {
		const mod = jest.fn(() => {
			return () => {}
		})
		const node = document.getElementById('a')

		loadModule({
			name: 'waffle',
			module: mod,
			node,
			id: 'Module'
		})

		const item = cache.get('Module')
		const module = jest.spyOn(item, 'destroy')
		unLoadModule('Module')
		expect(module).toHaveBeenCalledTimes(1)
		expect(cache.get('Module')).not.toBe(true)
	})

	it('should load any valid behaviours from the dom', async () => {
		const app = loadApp(mockLoader, document.body)
		await wait()

		const validItem = app.cache.get('a')
		expect(validItem).toMatchObject({
			hasLoaded: true
		})

		expect(fns.sandbox).toHaveBeenCalledTimes(1)
		expect(fns.responsive).not.toHaveBeenCalled()
	})

	it('should load behaviours once the query is valid', async () => {
		Object.defineProperty(window, 'matchMedia', {
			value: jest.fn(() => {
				return {
					matches: true,
					addListener: jest.fn(),
					removeListener: jest.fn()
				}
			})
		})
		loadApp(mockLoader, document.body)
		await wait()

		expect(fns.responsive).toHaveBeenCalledTimes(1)
	})
})
