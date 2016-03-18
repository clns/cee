module.exports = {
    entry: {
        editor: './index'
    },
    output: {
        path: 'example',
        filename: '[name].js'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /(node_modules|lib)/,
                query: {
                    presets: ['es2015'],
                    plugins: ['lodash']
                }
            }
        ]
    },
    resolve: {
        // you can now require('file') instead of require('file.coffee')
        extensions: ['', '.js', '.json']
    },
    devServer: {
        contentBase: "./example",
        noInfo: true, //  --no-info option
        hot: true,
        inline: true
    }
}
