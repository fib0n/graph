/*global window: false */
/*global console: false */
(function () {
    'use strict';
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var ARGUMENT_NAMES = /([^\s,]+)/g;
    var PROCESSING = 1;
    var DONE = 2;

    function cloneSimple(source) {
        var target = {};
        Object.keys(source).forEach(function (key) {
            if (source.hasOwnProperty(key)) {
                target[key] = source[key];
            }
        });
        return target;
    }

    // http://stackoverflow.com/a/9924463
    function getParamNames(func) {
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES) || [];
        return result;
    }

    function getDependencies(graph) {
        var dependencies = {};
        Object.keys(graph).forEach(function (key) {
            dependencies[key] = getParamNames(graph[key]);
        });
        return dependencies;
    }

    function process(currentNode, dependencies, status, callList) {
        if (!dependencies[currentNode]) {
            return;
        }
        status[currentNode] = PROCESSING;
        for (var i = 0, length = dependencies[currentNode].length; i < length; ++i) {
            var currentArg = dependencies[currentNode][i];
            if (status[currentArg] === PROCESSING) {
                throw new Error('Cyclic dependency found');
            }
            if (status[currentArg] !== DONE) {
                process(currentArg, dependencies, status, callList);
            }
        }
        status[currentNode] = DONE;
        callList.push(currentNode);
    }

    function tryResolveArgs(dependencies, resultsMap) {
        var args = [];
        for (var i = 0, length = dependencies.length; i < length; ++i) {
            if (!(dependencies[i] in resultsMap)) {
                return false;
            }
            args.push(resultsMap[dependencies[i]]);
        }
        return args;
    }

    function calculateValues(startValue, callList, dependencies, graph) {
        var resultsMap = cloneSimple(startValue);
        for (var i = 0, length = callList.length; i < length; ++i) {
            if (!(callList[i] in resultsMap)) {
                var args = tryResolveArgs(dependencies[callList[i]], resultsMap);
                if (!args) {
                    throw new Error('Can\'t resolve dependency ' + callList[i]);
                }
                resultsMap[callList[i]] = graph[callList[i]].apply(null, args);
            }
        }
        return resultsMap;
    }

    function graphEagerCompile(graph) {
        var dependencies = getDependencies(graph);
        console.log('dependencies: ' + JSON.stringify(dependencies));

        var status = {};
        var callList = [];

        // topological sort on dependencies
        Object.keys(dependencies).forEach(function (node) {
            if (status[node] !== DONE) {
                process(node, dependencies, status, callList);
            }
        });

        console.log('callList: ' + callList);

        return function (startValue) {
            return calculateValues(startValue, callList, dependencies, graph);
        };
    }

    function graphLazyCompile(graph) {
        var dependencies = getDependencies(graph);

        return function (startValue, functions) {
            var status = {};
            var callList = [];

            functions.forEach(function (node) {
                if (status[node] !== DONE) {
                    process(node, dependencies, status, callList);
                }
            });

            console.log('callList: ' + callList);

            var values = calculateValues(startValue, callList, dependencies, graph);
            var resultsMap = cloneSimple(startValue);
            functions.forEach(function (f) {
                resultsMap[f] = values[f];
            });
            return resultsMap;
        };
    }

    var statsGraph = {
        n: function (xs) {
            return xs.length;
        },
        m: function (xs, n) {
            return xs.reduce(function (a, b) {
                return a + b;
            }) / n;
        },
        k: function () {
            return 'no dep';
        },
        m2: function (xs, n) {
            return xs.map(function (a) {
                return a * a;
            }).reduce(function (a, b) {
                return a + b;
            }) / n;
        },
        v: function (m, m2) {
            return m2 - (m * m);
        }
    };

    var eagerStats = graphEagerCompile(statsGraph);
    var lazyStats = graphLazyCompile(statsGraph);

    console.log(eagerStats({
        xs: [1, 2, 3, 6]
    }));
    console.log(lazyStats({
        xs: [1, 2, 3, 6]
    }, ['n', 'k']));
}());
