module.exports = function( { babel = {} } ) {
	return [
		{
			loader: 'babel-loader',
			options: {
				...babel,
				presets: [ '@wordpress/default', ...( babel.presets || [] ) ],
				plugins: [ '@babel/plugin-transform-runtime', ...( babel.plugins || [] ) ]
			}
		}
	];
};
