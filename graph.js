var window = window || {};
(function () {
    'use strict';

    var console = window.console || {
        log: function () {}
    };

    function clone(oldObject) {
        return JSON.parse(JSON.stringify(oldObject));
    }

    //http://stackoverflow.com/a/9924463
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var ARGUMENT_NAMES = /([^\s,]+)/g;

    function getParamNames(func) {
        var fnStr = func.toString().replace(STRIP_COMMENTS, '');
        var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
        if (result === null)
            result = [];
        return result;
    }

    function getDependencies(graph) {
        var dependencies = {};
        for (var k in graph) {
            dependencies[k] = getParamNames(graph[k]);
        }
        return dependencies;
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

    function graphEagerCompile(graph) {
        var PROCESSING = 1,
            DONE = 2;

        var dependencies = getDependencies(graph),
            status = {},
            callList = [];

        console.log('dependencies: ' + JSON.stringify(dependencies));

        function process(currentNode) {
            if (!dependencies[currentNode]) {
                return;
            }
            status[currentNode] = PROCESSING;
            for (var i = 0, length = dependencies[currentNode].length; i < length; ++i) {
                var currentArg = dependencies[currentNode][i];
                if (status[currentArg] === PROCESSING) {
                    throw 'Cyclic dependency found';
                }
                if (status[currentArg] !== DONE) {
                    process(currentArg);
                }
            }
            status[currentNode] = DONE;
            callList.push(currentNode);
        }

        //topological sort on dependencies
        for (var node in dependencies) {
            if (status[node] !== DONE) {
                process(node);
            }
        }
        console.log('callList: ' + callList);

        return function (startValue) {
            var resultsMap = clone(startValue);

            for (var i = 0, length = callList.length; i < length; ++i) {
                if (!(callList[i] in resultsMap)) {
                    var args = tryResolveArgs(dependencies[callList[i]], resultsMap);
                    if (!args) {
                        throw 'Can\'t resolve dependency ' + callList[i];
                    }
                    resultsMap[callList[i]] = graph[callList[i]].apply(null, args);
                }
            }
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

    var stats = graphEagerCompile(statsGraph);

    console.log(stats({
        xs: [1, 2, 3, 6]
    }));
}());
