import { init } from '@rematch/core'
import { connectStore } from '../src/'

let store

describe('connect', () => {
	document.body.innerHTML =
		'<div style="transition: all 300ms ease" id="test" class="base-class" data-test="20" data-other="40"></div>'

	beforeEach(() => {
		store = init({
			models: {
				point: {
					state: {
						x: 0,
						y: 0
					},
					reducers: {
						move: (state, payload) => {
							const { x, y } = state
							const { x: nx = 0, y: ny = 0 } = payload
							return {
								...state,
								x: x + nx,
								y: y + ny
							}
						}
					},
					effects: {}
				}
			}
		})
	})

	it('should be a function', () => {
		expect(connectStore).toBeInstanceOf(Function)
	})

	it('should return a function when called with store and registerFunk', () => {
		const connect = connectStore(store)
		expect(connect).toBeInstanceOf(Function)
	})

	it('should compose modules with just store props', () => {
		const connect = connectStore(store)
		// get the cart state
		const mapState = ({ point }) => ({ point })
		// get all of the point actions
		const mapDispatch = ({ point }) => ({ ...point })

		const mod = ({ store: { move } }) => {
			move({ x: 20 })
		}

		const merge = connect({ mapState, mapDispatch })(mod)

		expect(merge).toBeInstanceOf(Function)

		merge({})

		expect(store.getState().point.x).toBe(20)
	})
})
