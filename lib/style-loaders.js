const MiniCSSExtractPlugin = require( 'mini-css-extract-plugin' );
const postcssPresetEnvPlugin = require( 'postcss-preset-env' );
const cssnanoPlugin = require( 'cssnano' );
const cssnanoPreset = require( './cssnano-preset-custom' );

module.exports = function( { minicss = {}, postcss = {}, postcssPresetEnv = {}, cssnano = {}, sass = {} } ) {
	return [
		{
			loader: MiniCSSExtractPlugin.loader,
		},
		{
			loader: 'css-loader',
			options: {
				url: false,
				import: false,
				sourceMap: true,
				...minicss,
			},
		},
		{
			loader: 'postcss-loader',
			options: {
				postcssOptions: {
					ident: 'postcss',
					sourceMap: true,
					...postcss,
					plugins: [
						...( postcss.plugins ?? [
							postcssPresetEnvPlugin( postcssPresetEnv ),
						] ),
						cssnanoPlugin( {
							preset: cssnanoPreset( cssnano ),
						} ),
					],
				},
			},
		},
		{
			loader: 'sass-loader',
			options: {
				sourceMap: true,
				...sass,
			},
		},
	];
};
