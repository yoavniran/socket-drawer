module.exports = function (grunt) {

    require("time-grunt")(grunt);

    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-mocha-test");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks("grunt-mocha-cov");

    grunt.initConfig({
        "pkg": grunt.file.readJSON("package.json"),

        "jshint": {
            "files": ["./src/*.js", "./test/*.js"],
            "options": {
                "jshintrc": ".jshintrc"
            }
        },

        "clean": ["./output/**/*"],

        mochaTest: {
            test: {
                options: {
                    reporter: "spec",
                    captureFile: "output/results.txt" // Optionally capture the reporter output to a file
//                    require: "coverage/blanket",
                },
                src: ["test/sd.tests.js"]
            }
        },

        mochacov: {
            coverage: {
                options: {
                    coveralls: true,
                    captureFile: "output/results.txt"
                }
            },
//            test: {
//                options: {
//                    reporter: "spec",
//                    captureFile: "output/results.txt"
//                }
//            },
//            options: {
//                reporter: "html-cov",
//            },
            options: {
                files: ["test/sd.tests.js"],
                output: "output/coverage.html"
            }
        }
    });

    grunt.registerTask("default", ["jshint", "clean", "mochaTest"]);
    grunt.registerTask("test", ["clean", "mochaTest"]);

    grunt.registerTask("coverage", ["clean", "mochacov:coverage"]);
};