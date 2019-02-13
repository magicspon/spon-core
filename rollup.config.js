import babel from 'rollup-plugin-babel'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import filesize from 'rollup-plugin-filesize'
import localResolve from 'rollup-plugin-local-resolve'
import { terser } from 'rollup-plugin-terser'
import minify from 'rollup-plugin-babel-minify'

const config = {
	input: 'src/index.js',
	output: [
		{
			file: 'build/index.js',
			format: 'umd',
			name: 'spon.js',
			globals: {
				react: 'React',
				'prop-types': 'PropTypes'
			}
		},
		{
			file: 'build/index.cjs.js',
			format: 'cjs',
			name: 'spon.js'
		},
		{
			file: 'build/index.esm.js',
			format: 'es'
		}
	],
	plugins: [
		peerDepsExternal(),
		babel({
			exclude: 'node_modules/**',
			runtimeHelpers: true,
			presets: [
				[
					'@babel/preset-env',
					{
						modules: false
					}
				]
			],
			plugins: [
				'@babel/plugin-syntax-dynamic-import',
				'@babel/plugin-proposal-class-properties',
				'@babel/plugin-transform-runtime',
				'@babel/plugin-transform-async-to-generator'
			]
		}),
		localResolve(),
		resolve(),
		commonjs({
			namedExports: {
				// left-hand side can be an absolute path, a path
				// relative to the current directory, or the name
				// of a module in node_modules
				'node_modules/deep-object-diff/dist/index.js': ['diff']
			}
		}),
		minify(),
		terser(),
		filesize()
	]
}

export default config
