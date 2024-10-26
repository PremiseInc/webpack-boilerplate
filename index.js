const { resolve } = require( 'path' );
const { sync: glob } = require( 'fast-glob' );
const MiniCSSExtractPlugin = require( 'mini-css-extract-plugin' );
const RemoveEmptyScriptsPlugin = require( 'webpack-remove-empty-scripts' );
const TerserPlugin = require( 'terser-webpack-plugin' );
const BrowserSyncPlugin = require( 'browser-sync-webpack-plugin' );
const scriptLoaders = require( './lib/script-loaders' );
const styleLoaders = require( './lib/style-loaders' );

const isProduction = process.env.NODE_ENV === 'production';
const mode = isProduction ? 'production' : 'development';

// Add any a new entry point by extending the webpack config.
function defaultBoilerplate( {
	folders = [ '.' ],
	entry,
	output,
	terser = {},
	loaders = {},
	syncBaseDir = true,
	syncStartPath,
	syncWatchFiles = [ '**/*.{html,min.js,css}' ],
	syncOptions = {},
	syncPluginOptions = {},
	debugPaths = false,
} ) {
	const srcDestPaths = folders.flatMap( folder => {
		const files = glob( `${ folder }/assets/src/{js,scss}/*.{js,scss}` );

		return files.map( file => {
			return [
				file.replace( '/src/', '/dist/' ).replace( '/scss/', '/css/' ).replace( /\.\w+$/, '' ),
				resolve( process.cwd(), file ),
			];
		} );
	} );

	if ( debugPaths ) {
		console.log( srcDestPaths );
	}

	return {
		mode,
		entry: entry ?? Object.fromEntries( srcDestPaths ),
		output: {
			filename: '[name].js',
			path: process.cwd(),
			...output,
		},
		optimization: {
			// Only concatenate modules in production, when not analyzing bundles.
			concatenateModules: isProduction && ! process.env.WP_BUNDLE_ANALYZER,
			minimizer: [
				new TerserPlugin( {
					parallel: true,
					terserOptions: {
						output: {
							comments: /translators:/i,
						},
						compress: {
							passes: 2,
						},
						mangle: {
							reserved: [ '__', '_n', '_nx', '_x' ],
						},
						...terser,
					},
					extractComments: false,
				} ),
			],
		},
		module: {
			rules: [
				{
					test: /\.m?(j|t)sx?$/,
					exclude: /node_modules/,
					use: scriptLoaders( loaders ),
				},
				{
					test: /\.(sc|sa)ss$/,
					use: styleLoaders( loaders ),
				},
				{
					test: /\.(bmp|png|jpe?g|gif|svg|webp|woff|woff2|eot|ttf|otf)$/i,
					type: 'asset/resource',
				},
			],
		},
		plugins: [
			new MiniCSSExtractPlugin( { filename: '[name].css' } ),
			new RemoveEmptyScriptsPlugin( {
				stage: RemoveEmptyScriptsPlugin.STAGE_AFTER_PROCESS_PLUGINS,
			} ),
			new BrowserSyncPlugin( {
				host: 'localhost',
				port: 5759,
				startPath: syncStartPath,
				server: syncBaseDir,
				files: syncWatchFiles,
				...syncOptions,
			}, syncPluginOptions ),
		],
	};
};

function wordpressBoilerplate( {
	themeId,
	...config
} ) {
	return defaultBoilerplate( {
		syncStartPath: './mockup/index.html',
		syncBaseDir: `./themes/${ themeId }`,
		syncWatchFiles: [
			// Only watch theme and mockup assets
			`./themes/${ themeId }/assets/img/**`,
			`./themes/${ themeId }/assets/dist/css/theme.css`,
			`./themes/${ themeId }/assets/dist/css/print.css`,
			`./themes/${ themeId }/assets/dist/css/icons.css`,
			`./themes/${ themeId }/assets/dist/js/theme.min.js`,
			`./themes/${ themeId }/mockup/*.html`,
			`./themes/${ themeId }/mockup/*.css`,
			`./themes/${ themeId }/mockup/*.js`,
		],
		folders: [
			'mu-plugins/gutenberg',
			'plugins/premise-*',
			'themes/*',
		],
		...config,
	} );
}

module.exports = function( template, config ) {
	if ( typeof template === 'object' ) {
		config = template;
		template = 'default';
	}

	let boilerplate = defaultBoilerplate;

	switch ( template ) {
		case 'wordpress':
			boilerplate = wordpressBoilerplate;
			break;
	}

	return boilerplate( config );
};
