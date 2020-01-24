const { fixResolvePath, getResolverAlias } = require("./webpacktools");

module.exports = function (api) {
    api.cache(true);

    return {
        "presets": [
            "@babel/preset-react",
            [
                "@babel/preset-env",
                {
                    "targets": {
                        "browsers": [
                            "last 2 versions"
                        ]
                    }
                }
            ]
        ],
        "plugins": [
            "react-html-attrs",
            [
                "module-resolver",
                {
                    root: ["./"],
                    alias: getResolverAlias(__dirname),
                    resolvePath: fixResolvePath(__dirname),
                },
            ],
            "@babel/plugin-proposal-object-rest-spread",
            [
                "@babel/plugin-transform-runtime",
                {
                    "helpers": false,
                    "regenerator": true
                }
            ],
            "@babel/plugin-proposal-class-properties",
            "@babel/plugin-proposal-nullish-coalescing-operator",
            "@babel/plugin-proposal-optional-chaining",
            "@babel/plugin-transform-react-constant-elements",
            "@babel/plugin-transform-react-inline-elements",
            "@babel/plugin-transform-react-jsx-source",
            "@babel/plugin-syntax-dynamic-import"
        ],
        "env": {
            "test": {
                "plugins": [
                    "babel-plugin-dynamic-import-node"
                ]
            },
            "development": {
                "compact": false
            }
        }
    };
};

