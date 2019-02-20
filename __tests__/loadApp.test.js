import { wait } from 'dom-testing-library'
import { loadApp, cache } from '../src/'

/*
	<div  data-behaviour="sandbox"></div>

*/

describe('test loadApp', () => {
	document.body.innerHTML = `<div id="root">
															<div data-behaviour="sandbox"></div>
															<div data-behaviour="responsive" data-query="(min-width: 1000px)"></div>
														</div>`

	let app
	let originalMatchMedia = window.matchMedia
	function createMockMediaMatcher(matches) {
		return () => ({
			matches,
			addListener: () => {},
			removeListener: () => {}
		})
	}

	beforeEach(() => {
		window.resizeTo(200, 1000)
		originalMatchMedia = window.matchMedia
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
	})

	beforeAll(async () => {
		app = loadApp(document.getElementById('root'), {
			fetch: name => import(`${__dirname}/behaviour/${name}`)
		})
	})

	afterAll(() => {
		document.body.innerHTML = ''
		app.destroy()
	})

	it('should be a function', () => {
		expect(loadApp).toBeInstanceOf(Function)
	})

	it('should return an object', () => {
		expect(app).toBeInstanceOf(Object)
	})

	it('should return an object with the right methods', () => {
		expect(app.hydrate).toBeInstanceOf(Function)
		expect(app.destroy).toBeInstanceOf(Function)
	})

	it('should have eventBus events', () => {
		// these are mitt functions... no need to go test mental
		expect(app.on).toBeInstanceOf(Function)
		expect(app.off).toBeInstanceOf(Function)
		expect(app.emit).toBeInstanceOf(Function)
	})

	it('should add any valid data-behaviour nodes to the cache', async () => {
		await wait(() => {
			expect(cache.get('sandbox-0').hasLoaded).toBe(true)
			expect(cache.get('responsive-1').hasLoaded).toBe(false)
		})
	})

	it('should load modules on resize if the query is true', async () => {
		window.resizeTo(1200, 1000)
		window.matchMedia = createMockMediaMatcher(true)

		await wait(() => {
			expect(cache.get('responsive-1').hasLoaded).toBe(true)
		})
	})

	it('should unload modules on resize if the query is false', async () => {
		window.resizeTo(200, 1000)
		window.matchMedia = createMockMediaMatcher(false)

		await wait(() => {
			expect(cache.get('responsive-1').hasLoaded).toBe(false)
		})
	})

	it('should remove modules from the cache when destroy is called', () => {
		app.destroy()

		expect(cache.has('sandbox-0')).toBe(false)
	})

	describe('the use function', () => {
		it('should be a function', () => {
			expect(app.use).toBeInstanceOf(Function)
		})

		it('should add plugins to the app', () => {
			app.use('fn', () => {})
			expect(app.plugins).toBeInstanceOf(Object)
			expect(Object.keys(app.plugins)[0]).toBe('fn')
		})

		it('plugins should recieve some props', () => {
			app.use('fn', props => {
				expect(props.eventBus).toBeInstanceOf(Object)
			})
		})

		it('recieve any props passed from the third argument', () => {
			app.use(
				'fn',
				props => {
					expect(props.hello).toBe(2000)
				},
				{ hello: 2000 }
			)
		})
	})
})
