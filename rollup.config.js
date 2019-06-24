// import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import filesize from 'rollup-plugin-filesize'
import { terser } from 'rollup-plugin-terser'
// import minify from 'rollup-plugin-babel-minify'

const config = {
	input: 'src/index.js',
	output: [
		{
			file: 'build/index.js',
			format: 'umd',
			name: 'spon.js'
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
		// babel({
		// 	exclude: 'node_modules/**',
		// 	runtimeHelpers: false,
		// 	presets: [
		// 		[
		// 			'@babel/preset-env',
		// 			{
		// 				modules: false
		// 			}
		// 		]
		// 	]
		// }),
		resolve(),
		commonjs(),
		// minify(),
		terser(),
		filesize()
	]
}

export default config
