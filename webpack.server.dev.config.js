const HtmlWebpackPlugin = require('html-webpack-plugin');


const commonConfig = {
    mode: "development",
    module: {
      rules: [
        {
            test: /\.svg$/,
            issuer: /\.[jt]sx?$/,
            use: [{
                loader:'@svgr/webpack',
                options: {
                    expandProps: "end",
                    svgoConfig: {}
                }
            }]
        },{
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/
        },{
          test: /\.jsx?$/,
          loader: 'babel-loader',
          exclude: [/node_modules/]
        },{
          test: /\.s?css$/,
          use: ['style-loader', {
              loader: 'css-loader',
              options: {
                  modules: {
                      localIdentName:'[local]'
                  }
              }
          },'sass-loader']
        }
      ]
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js', 'jsx' ],
      fallback: {
          fs: false,
          buffer: require.resolve('buffer'),
          crypto: require.resolve('crypto-browserify'),
          path: require.resolve('path-browserify'),
          stream: require.resolve('stream-browserify')
      }
    },
    devtool: 'source-map'
};

const examples = ['MultipleTracks', 'MultipleAlignment', 'CompositeTrack', 'CustomTooltip', 'BlockAreaTrack'];
const entries = examples.reduce((prev,current)=>{prev[current]=`./src/RcsbFvExamples/${current}.ts`;return prev;},{});

const server = {
    ...commonConfig,
    entry: entries,
    performance:{
        hints:false
    },
    devServer: {
        compress: true,
        port: 9000,
    },
    plugins: Object.keys(entries).map(key=>new HtmlWebpackPlugin({
        filename:`${key}.html`,
        template:'./src/RcsbFvExamples/index.html',
        inject: true,
        chunks:[key]
    }))
}

module.exports = [server];