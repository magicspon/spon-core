import { withPlugins } from '../src/'

describe('connect', () => {
	document.body.innerHTML =
		'<div style="transition: all 300ms ease" id="test" class="base-class" data-test="20" data-other="40"></div>'

	it('should be a function', () => {
		expect(withPlugins).toBeInstanceOf(Function)
	})

	it('should compose modules with just plugin props', () => {
		let result = 0

		const mod = ({ a, plugins: { b, c } }) => {
			result = a + b + c
		}

		const plugin = () => {
			return { b: 2 }
		}

		const plugin2 = () => {
			return { c: 3 }
		}

		const merge = withPlugins(plugin, plugin2)(mod)

		merge({ a: 10 })
		expect(result).toBe(15)
	})
})
