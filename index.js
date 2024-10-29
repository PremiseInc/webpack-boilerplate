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

function makeConfig( name, {
	srcGlobs,
	debugPaths = false,
	entry,
	suffix,
	output,
	terser = {},
	loaders = {},
	rules = [],
	plugins: extraPlugins = [],
	sync,
} ) {
	const srcDestPaths = srcGlobs.flatMap( srcGlob => {
		const files = glob( srcGlob );

		return files.map( file => {
			if ( file.match( /\.min\.\w+$/ ) ) {
				return null;
			}

			return [
				file.replace( '/src/', '/dist/' ).replace( '/scss/', '/css/' ).replace( /\.\w+$/, '' ) + ( suffix ?? '' ),
				resolve( process.cwd(), file ),
			];
		} ).filter( v => v );
	} );

	if ( debugPaths ) {
		console.log( srcDestPaths );
	}

	if ( ! srcDestPaths.length ) {
		return null;
	}

	const plugins = [
		new MiniCSSExtractPlugin( { filename: '[name].css' } ),
		new RemoveEmptyScriptsPlugin( {
			stage: RemoveEmptyScriptsPlugin.STAGE_AFTER_PROCESS_PLUGINS,
		} ),
	];

	if ( sync ) {
		const {
			baseDir: syncBaseDir = true,
			startPath: syncStartPath,
			watchFiles: syncWatchFiles = [ '**/*.{html,min.js,css}' ],
			options: syncOptions = {},
			pluginOptions: syncPluginOptions = {},
		} = ( typeof sync === 'object' ? sync : {} );

		plugins.push( new BrowserSyncPlugin( {
			host: 'localhost',
			port: 5759,
			startPath: syncStartPath,
			server: syncBaseDir,
			files: syncWatchFiles,
			...syncOptions,
		}, syncPluginOptions ) );
	}

	return {
		name,
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
				...rules,
			],
		},
		plugins: [
			...plugins,
			...extraPlugins,
		],
		stats: 'minimal',
	};
}

// Add any a new entry point by extending the webpack config.
function defaultBoilerplate( {
	collections = { default: [ '.' ] },
	getGlobs = folder => [
		`${ folder }/assets/src/js/*.js`,
		`${ folder }/assets/src/scss/*.scss`,
	],
	sync = true,
	...config
} ) {
	return Object.entries( collections ).map( ( [ name, paths ], index ) => {
		return makeConfig( name, {
			srcGlobs: paths.map( getGlobs ),
			sync: index === 0 ? sync : false,
			...config,
		} );
	} ).filter( v => v );
};

function wordpressBoilerplate( {
	themeId,
	sync,
	...config
} ) {
	return defaultBoilerplate( {
		collections: {
			theme: [ `themes/${ themeId }` ],
			muplugins: [ 'mu-plugins/gutenberg' ],
			plugins: [
				'plugins/premise-*',
				`plugins/${ themeId }-*`,
			],
		},
		sync: {
			startPath: './mockup/index.html',
			baseDir: `./themes/${ themeId }`,
			watchFiles: [
				// Only watch theme and mockup assets
				`./themes/${ themeId }/assets/img/**`,
				`./themes/${ themeId }/assets/dist/css/theme.css`,
				`./themes/${ themeId }/assets/dist/css/print.css`,
				`./themes/${ themeId }/assets/dist/css/icons.css`,
				`./themes/${ themeId }/assets/dist/js/theme.js`,
				`./themes/${ themeId }/mockup/*.html`,
				`./themes/${ themeId }/mockup/*.css`,
				`./themes/${ themeId }/mockup/*.js`,
			],
			...sync,
		},
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
