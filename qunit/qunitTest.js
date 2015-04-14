/**
 * Created by wangyang7 on 2015/3/4.
 */
(function( window ){

var QUnit,
	config,
	onErrorFnPrev,
	loggingCallbacks = {},
	fileName = ( sourceFromStacktrace( 0 ) || "" ).replace( /(:\d+)+\)?/,"" ).replace( /.+\//,"" ),
	toString = Object.prototye.toString,
	hasOwn = Object.prototype.hasOwnProperty,
	Date = window.Date,
	now = Date.now || function(){
	    return new Date().getTime();
    },
	globalStartCalled = false,
	runStarted = false,
	setTimeout = window.setTimeout,
	clearTimeout = window.clearTimeout,
	defined = {
	    document: window.document !== undefined,
		setTimeout: window.setTimeout !== undefined,
		sessionStorage: (function(){
		    var x = "qunit-test-string";
			try{
				sessionStorage.setTime( x, x );
				sessionStorage.removeItem( x );
				return true;
			}
			catch (e){
				return false;
			}
		}())
	},
	errorString = function( error ){
	     var name, message,
			 errorString = error.toString();
		 if( errorString.substring( 0, 7 ) === "[object" ) {
		     name = error.name ? error.name.toString() : "";
			 message = error.message ? error.message.toString() : "";
			 if( name && message ) {
			    return name + ": " + message;
			 } else if( name ) {
			    return name;
			 } else if( message ) {
			    return message;
			 } else {
			    return "Error";
			 }
		 } else {
		     return errorString;
		 }
	},
	objectValues = function( obj ) {
	    var key, val,
			vals = QUnit.is( "array", obj ) ? [] : {};
		for( key in obj ) {
		   if( hasOwn.call( obj, key ) ) {
		     val = obj[ key ];
			 vals[ key ] = val === Object( val ) ? objectValues( val ) : val;
		   }
		}
		return vals;  
	};

QUnit = {};

config = {
    queue: [],
	blocking: true,
	reorder:true,
	altertitle: true,
	scrolltop: true,
	requireExpects: false,
	urlConfig: [
	    {
		   id: "hidepassed",
		   label: "Hide passed tests",
		   tooltip: "Only show tests and assertions that fail. Stored as query-strings."
	    },
		{
			id: "noglobals",
			label: "Check for Globals",
			tooltip: "Enabling this will test if any test introduces new properties on the " +
				"`window` object. Stored as query-strings."
		},
		{
			id: "notrycatch",
			label: "No try-catch",
			tooltip: "Enabling this will run tests outside of a try-catch block. Makes debugging " +
				"exceptions in IE reasonable. Stored as query-strings."
		}
	],

    modules: [],
	currentModule: {
	    name: "",
		tests: []
	},
	callbacks: []
	
};

config.modules.push( config.currentModule );

(function(){
   var i, current,
	   location = window.location || { search: "", protocol: "file:" },
	   params = location.search.slice( 1 ).split( "&" ),
	   length = params.length,
	   urlParams = {};

   if( params[ 0 ] ) {
      for( i = 0; i < length; i++ ) {
	     current = params[ i ].split( "=" );
		 current[ 0 ] = decodeURIComponent( current[ 0 ] );

		 current[ 1 ] = current[ 1 ] ? decodeURIComponent( current[ 1 ] ) : true;
		 if( urlParams[ current[ 0 ] ] ) {
		    urlParams[ current[ 0 ] ] = [].concat( urlParams[ current[ 0 ] ], current[ 1 ] );
		 } else {
		    urlParams[ current[ 0 ] ] = current[ 1 ];
		 }
	  }
   }

   if( urlParams.filter === true ) {
       delete urlParams.filter;
   }

   QUnit.urlParams = urlParams;
   config.filter = urlParams.filter;
   config.testId = [];
   if( urlParmas.testId ) {
      urlParams.testId = [].concat( urlParams.testId );
	  for ( i = 0; i < urlParams.testId.length; i++ ){
	      config.testId.push( urlParams.testId[ i ] );
	  }
   }
   QUnit.isLocal = location.protocol === "file:";
}());
	
extend( QUnit, {
    module: function( name, testEnvironment ){
	    var currentModule = {
		    name: name,
			testEnvironment: testEnvironment,
			tests: []
		};

		if( testEnvironment && testEnvironment.setup ) {
		   testEnvironment.beforeEach = testEnvironment.setup;
		   delete testEnvironment.setup;
		}
		if( testEnvironment && testEnvironment.teardown ) {
		   testEnvironment.afterEach = testEnvironment.teardown;
		   delete testEnvironment.teardown;
		}

		config.modules.push( currentModule );
		config.currentModule = currentModule;
	},

	asyncTest: function( testName, expected, callback ){
	    if ( arguments.length === 2 ) {
		    callback = expected;
			expected = null;
		}

		QUnit.test( testName, expected, callback, true );
	},

	test: function( testName, expected, callback, async ) {
	    var test;

		if( arguments.length === 2 ) {
		   callback = expected;
		   expected = null;
		}

		test = new Test({
		    testName: testName,
			expected: expected,
			async: async,
			callback: callback
		});
		
		test.queue();
	},

	start: function( count ) {
	    var globalStartAlreadyCalled = globalStartCalled;
		if( !config.current ) {
		   globalStartCalled = true;
		   if( runStarted ) {
		      throw new Error( "Called start() outside of a test context while already started" );
		   } else if ( globalStartAlreadyCalled || count > 1 ) {
		      throw new Error( "Called start() outside of a test context too many times" );
		   } else if( config.autostart ) {
		      throw new Error( "Called start() outside of a test context when " +
					"QUnit.config.autostart was true" );
		   } else if( !config.pageLoaded ) {
		       config.autostart = true;
			   return;
		   }
		} else {
            config.current.semaphore -= count || 1;
            if( config.current.semaphore > 0 ) {
                return;
            }

            if( config.current.semaphore < 0 ) {
                config.current.semaphore = 0;

                QUnit.pushFailure(
                    "Called start() while already started (test's semaphore was 0 already)",
                    sourceFromStacktrace(2) //源从堆栈跟踪
                );
                return;
            }
        }

        resumeProcessing(); //恢复处理
	},

    stop: function( count ) {
        if( !config.current ) {
            throw new Error( "Called stop() outside of a test context" );
        }

        // If a test is running, adjust its semaphore   // adjust--调整  semaphore--信号
        config.current.semaphore += count || 1;

        pauseProcessing();
    },

    config: config,

    is: function( type, obj  ) {
        return QUnit.objectType( obj ) === type;
    },

    objectType: function( obj ) {
        if( typeof obj === "undefined" ) {
            return "undefined";
        }

        // Consider: typeof null === object
        if( obj === null ) {
            return "null";
        }

        var match = toString.call( obj).match( /^\[object\s(.*)\]$/),
            type = match && match[ 1 ] || "";

        switch ( type ) {
            case "Number":
                if( isNaN( obj ) ) {
                    return "nan";
                }
                return "number";
            case "String":
            case "Boolean":
            case "Array":
            case "Date":
            case "RegExp":
            case "Function":
                return type.toLocaleLowerCase();
        }
        if( typeof obj === "object" ) {
            return "object";
        }
        return undefined;
    },

    extend: extend,

    load: function() {
        config.pageLoaded = true;

        // Initialize the configuration options
        extend( config, {
            stats: { all: 0, bad: 0 },
            moduleStats: { all: 0, bad: 0 },
            started: 0,
            updateRate: 1000,
            autostart: true,
            filter: ""
        }, true );

        config.blocking = false; //blocking --阻塞

        if( config.autostart ) {
            resumeProcessing();
        }
    }
} );

// Register logging callbacks //登记日志回调
(function() {
    var i, l, key,
        callbacks = [ "begin", "done", "log", "testStart", "testDone",
             "moduleStart", "moduleDone" ];

    function registerLoggingCallback( key ) {
        var loggingCallback = function( callback ) {
            if( QUnit.objectType( callback ) !== "function" ) {
                throw new Error(
                    //QUnit日志方法需要一个回调函数作为他们的第一个参数
                    "QUnit logging methods require a callback function as their first parameters."
                );
            }

            config.callbacks[ key ].push( callback );
        };

        // deprecated-- 弃用
        // DEPRECATED: This will be removed on QUnit 2.0.0+
        //商店注册允许恢复功能
        // modified -- 改进的
        // Stores the registered functions allowing restoring
        // at verifyLoggingCallbacks() if modified
        loggingCallbacks[ key ] = loggingCallback;

        return loggingCallback;

    }
})();

// `onErrorFnPrev` initialized at top of scope //在初始化范围
// Preserve other handlers //保留其他处理程序
onErrorFnPrev = window.onerror;

// Cover untaught exceptions
// Returning true will suppress the default browser handler, //suppress -- 抑制；镇压；废止
// returning false will let it run.
window.onerror = function( error, filePath, linerNr ) {
    var ret = false;
    if( onErrorFnPrev ) {
        ret = onErrorFnPrev( error, filePath, lineNr );
    }

    // Treat return value as window.onerror itself does,
    // Only do our handling if not suppressed.
    if( ret !== true ) {
        if( QUnit.config.current ) {
            if( QUnit.config.current.ignoreGlobalErrors ) {
                return true;
            }
            QUnit.pushFailure( error, filePath + ":" + linerNr );
        } else {
            QUnit.test( "global failure", extend(function() {
                QUnit.pushFailure( error, filePath + ":" + linerNr );
            }, { validTest: true }) );
        }
        return false;
    }

    return ret;
};

function done() {
    var runtime, passed;

    config.autorun = true;

    // Log the last module results  日志最后模块的结果
    // previousModule 以前的模块
    if( config.previousModule ) {
        //moduleDone模块完成
        runLoggingCallbacks( "moduleDone", {
            name: config.previousModule.name,
            tests: config.previousModule.tests,
            failed: config.moduleStats.bad,
            passed: config.moduleStats.all - config.moduleStats.bad, //passed 已经通过的
            total: config.moduleStats.all,
            runtime: now() - config.moduleStats.started
        });
    }
    delete config.previousModule;

    runtime = now() - config.started;
    passed = config.stats.all - config.stats.bad;

    runLoggingCallbacks( "done", {
        failed: config.stats.bad,
        passed: passed,
        total: config.stats.all,
        runtime: runtime
    });
}


// Doesn't support IE6 to IE9
// See also https://
// extract Stack trace   提取堆栈跟踪
function extractStacktrace( e, offset ) {
    offset = offset === underfined ? 4 : offset;

    var stack, include, i;
    if( e.stacktrace ) {

        // Opera 12.x
        return e.stacktrace.split( "\n" )[ offset + 3 ];
    } else if (e.stack ) {

        // Firefox,Chrome,Safari 6+, IE10+, PhantomJS and Node
        stack = e.stack.split( "\n" );
        if( /^error$/i.test( stack[ 0 ] ) ) {
            stack.shift();
        }
        if( fileName ) {
            include = [];
            for( i = offset; i < stack.length; i++ ) {
                if( stack[ i ].indexOf( fileName ) !== -1 ) {
                    break;
                }
                include.push( stack[ i ] );
            }
            if( include.length ) {
                return include.join( "\n" );
            }
        }
        return stack[ offset ];
    } else if (e.sourceURL ) {

        // Safari < 6
        // exclude useless self-reference for generated Error abjects --排除无用的自我参照生成错误的
        if( /qunit.js$/.test(e.sourceURL ) ) {
            return;
        }

        // for actual exceptions, this is useful -- 对于实际的例外,这是有用的
        return e.sourceURL + ":" + e.line;
    }
}

function sourceFromStacktrace( offset ) {
    var e = new Error();
    if( !e.stack ) {
        try {
            throw e;
        } catch ( err ) {
            // This should already be true in most browsers
            e = err;
        }
    }
    return extractStacktrace( e, offset );
}

function process( last ) {
    function next() {
        process( last );
    }
    var start = now();
    config.depth = ( config.depth ) + 1 ;

    while ( config.queue.length && !config.blocking ) {
         if( !defined.setTimeout || config.updateRate <= 0 ||
                ( ( now() - start ) < config.updateRate ) ) {
             if( config.current ) {

                 // Reset async tracking for each phase of the Test lifecycle
                 config.current.usedAsync = false;
             }
             config.queue.shift()();
         } else {
             setTimeout( next, 13 );
             break;
         }
    }
    config.depth--;
    if( last && !config.blocking && !config.queue.length && config.depth === 0 ) {
        done();
    }
}

function begin() {
    var i, l,
        modulesLog = [];

    // If the test run hasn't officially begun yet --如果测试尚未正式开始运行
    if( !config.started ) {

        // Record the time of the test run's beginning
        config.started = now();

        //verify Logging Callbacks - 验证日志回调
        verifyLoggingCallbacks();

        // Delete the loose unnamed module if unused. 如果未使用删除松散不知名的模块
        if( config.modules[ 0 ].name === "" && config.modules[ 0 ].tests.length === 0 ) {
            config.modules.shift();
        }

        // Avoid unnecessary information by not logging modules' test environments.避免不必要的信息不是日志模块的测试环境。
        for( i = 0, l = config.modules.length; i < l; i++ ) {
            modulesLog.push({
                name: config.modules[ i ].name,
                tests: config.modules[ i ].tests
            });
        }

        // The test run is officially beginning now. 测试运行现在正式开始
        runLoggingCallbacks( "begin", {
            totalTests: Test.count,
            modules: modulesLog
        });
    }

    config.blocking = false;
    process( true );
}

//恢复处理
function resumeProcessing() {
    runStarted = true;

    // A slight delay to allow this iteration of the event loop to finish (more assertions, etc.)--稍有延迟,让这事件循环的迭代来完成(更多的断言,等等)。
    if( defined.setTimeout ) {
        setTimeout(function(){
            if( config.current && config.current.semaphore > 0 ) {
                return;
            }
            if( config.timeout ) {
                clearTimeout( config.timeout );
            }

            begin();
        } ,13 );
    } else {
        begin();
    }
}

function pauseProcessing() {
    config.blocking = true;

    if( config.testTimeout && defined.setTimeout ) {
        clearTimeout( config.timeout );
        config.timeout = setTimeout(function() {
            if( config.current ) {
                config.current.semaphore = 0;
                QUnit.pushFailure( "Test timed out", sourceFromStacktrace( 2 ) );
            } else {
                throw new Error( "Test timed out" );
            }
            resumeProcessing();
        }, config.testTimeout);
    }
}

//save global -- 保存文件
function saveGlobal() {
    config.pollution = [];

    if( config.noglobals ) {
        for(var key in window  ) {
            if( hasOwn.call( window, key ) ) {
                // in Opera sometimes DOM element ids show up here, ignore them. 在Opear有时DOM元素id出现在这里,忽略它们。
                if( /^qunit-test-output/.test( key ) ) {
                    continue;
                }
                //pollution --回收池
                config.pollution.push( key );
            }
        }
    }
}

function checkPollution() {
    var newGlobals,
        deletedGlobals,
        old = config.pollution;

    saveGlobal();

    newGlobals = diff( config.pollution, old );
    if( newGlobals.length > 0 ) {
        QUnit.pushFailure( "Introduced global variable(s): " + newGlobals.join( ", " ) );
    }

    deletedGlobals = diff( old, config.pollution );
    if( deletedGlobals.length > 0 ) {
        QUnit.pushFailure( "Deleted golbal variable(s): " + deleteGlobals.join( ", " ) );
    }
}

// returns a new Array with the elements that are in a but not in b.  返回一个新的数组的元素,但不是在b。
function diff( a, b ) {
    var i, j,
        result = a.slice();

    for( i = 0; i < result.length; i++ ) {
        for( j = 0; j < b.length; j++ ) {
            if( result[ i ] === b[ j ] ) {
                result.splice( i, 1 );
                i--;
                break;
            }
        }
    }
    return result;
}

function extend( a, b, undefOnly ) {
    for( var prop in b ) {
        if( hasOwn.call( b, prop ) ) {
            // Avoid "Member not found" error in IE8 caused by messing with window.constructor. 避免“成员没有找到“IE8误差干扰window.constructor所致。
            if( !( prop === "constructor" && a === window ) ) {
                if( b[ prop ] === undefined ) {
                    delete a[ prop ];
                } else if( !( undefOnly && typeof a[ prop ] !== "undefined" ) ) {
                    a[ prop ] = b[ prop ];
                }
            }
        }
    }
    return a;
}

function runLoggingCallbacks( key, args ) {
    var i, l, callbacks;

    callbacks = config.callbacks[ key ];
    for( i = 0, l = callbacks.length; i < 1; i++ ) {
        callbacks[ i ]( args );
    }
}

// DEPRECATED: This will be removed on 2.0.0+
// This function verifies if the loggingCallbacks were modified by the user
// If so, it will restore it, assign the given callback and print a console warning
function verifyLoggingCallbacks() {
    var loggingCallback, userCallback;

    for( loggingCallback in loggingCallbacks ) {
        if( QUnit[ loggingCallback ] !== loggingCallbacks[ loggingCallback ] ) {

            userCallback = QUnit[ loggingCallback ];

            // Restore the callback function. 恢复回调函数
            QUnit[ loggingCallback ] = loggingCallbacks[ loggingCallback ];

            // Assign the deprecated given callback. 指定的弃用回调
            QUnit[ loggingCallback ]( userCallback );

            if( window.console && window.console.warn ) {

            }


        }
    }
}

// from jquery.js
function inArray( elem, array ) {
    if( array.indexOf ) {
        return array.indexOf( elem );
    }

    for( var i = 0, length = array.length; i < length; i++ ) {
        if( array[ i ] === elem ) {
            return i;
        }
    }

    return -1;
}

function Test( settings ) {
    var i,l;

    ++Test.count;

    extend( this, settings );
    // assertions -- 断言
    // semaphore -- 信号
    this.assertions = [];
    this.semaphore = 0;
    this.usedAsync = false;
    this.module = config.currentModule;
    this.stack = sourceFromStacktrace( 3 );

    // Register unique strings -- 注册独唯一的字符串
    for( i = 0, l = this.module.tests; i < l.length; i++ ) {
        if( this.module.tests[ i ].name === this.testName ) {
            this.testName += " ";
        }
    }

    // generate hash 生成散列
    this.testId = generateHash( this.module.name, this.testName );

    this.module.tests.push({
        name: this.testName,
        testId: this.testId
    });

    if( settings.skip ) {
        // Skipped tests will fully ignore any sent callback 跳过测试将完全忽略任何发送回调
        this.callback = function() {};
        this.async = false;
        this.expected = 0;
    } else {
        this.assert = new Assert( this );
    }
}

Test.count = 0;
Test.prototype = {
    before: function() {
        if(

           // Emit moduleStart when we're switching from one module to another
           this.module !== config.previousModule ||

               //They could be equal (both undefined) but if the previousModule property doesn't
               // yet exist is means this is the first test in a suite that isn't wrapped in a
               // module, in which case we'll just emit a moduleStart event for 'undefined'.
               // Without this, reporters can get testStart before moduleStart which is a problem.
               !hasOwn.call( config, "previousModule" )
        ) {
            if( hasOwn.call( config, "previousModule" ) ) {
                runLoggingCallbacks( "moduleDone", {
                    name: config.previousModule.name,
                    tests: config.previousModule.tests,
                    failed: config.moduleStats.bad,
                    passed: config.moduleStats.all - config.moduleStats.bad,
                    total: config.moduleStats.all,
                    runtime: now() - config.moduleStats.started
                });
            }
            config.previousModule = this.module;
            config.moduleStats = { all: 0, bad: 0, started: now() };
            runLoggingCallbacks( "moduleStart", {
                name: this.module.name,
                tests: this.module.tests
            });
        }

        config.current = this;

        this.testEnvironment = extend( {}, this.module.testEnvironment );
        delete this.testEnvironment.beforeEach;
        delete this.testEnvironment.afterEach;

        this.started = now();
        runLoggingCallbacks( "testStart", {
            name: this.testName,
            module: this.module.name,
            testId: this.testId
        });

        if( !config.pollution ) {
            saveGlobal();
        }

    },

    run: function() {
        var promise;

        config.current = this;

        if( this.async ) {
            QUnit.stop();
        }

        this.callbackStarted = now();
        if( config.notrycatch ) {
            // assert--维护，坚持；断言；主张；声称
            promise = this.callback..call( this.testEnvironment, this.assert );
            this.resolvePromise( promise );
            return;
        }

        try {
            promise = this.callback.call( this.testEnvironment, this.assert );
            this.resolvePromise( promise );
        } catch( e ) {
            //断言- assertions
            this.pushFailure( "Died on test #" + ( this.assertions.length + 1 ) + " " +
                this.stack + ": " + ( e.message || e ), extractStacktrace( e, 0 ) );

            // else next test will carry the responsibility
            saveGlobal();

            // Restart the tests if they're blocking -- 如果他们阻碍重新启动测试
            if ( config.blocking ) {
                QUnit.start();
            }
        }
    },

    after: function() {
        checkPollution();
    },

    // hook 挂钩，吊钩
    queueHook: function( hook, hookName ) {
        var promise,
            test = this;
        return function runHook() {
            config.current = test;
            if( config.notrycatch ) {
                promise = hook.call( test.testEnvironment, test.assert );
                test.resolvePromise( promise, hookName );
                return;
            }
            try {
                promise = hook.call( test.testEnvironment, test.assert );
                test.resolvePromise( promise, hookName );
            } catch ( error ) {
                test.pushFailure( hookNmae + " failed on " + test.testName + ": " +
                    ( error.message || error ), extractStacktrace( error, 0 ) );
            }
        };
    },

    // Currently only used for module level hooks, can be used to add global level ones
    // -- 目前只用于模块级钩子,可以用来添加全球层面的
    hooks: function( handler ) {
        var hooks = [];

        // Hooks are ignored on skipped tests --钩子上忽略跳过测试
        if( this.skip ) {
            return hooks;
        }

        if( this.module.testEnvironment &&
               QUnit.objectType( this.module.testEnvironment[ handler ] ) === "function" ) {
            hooks.push( this.queueHook( this.module.testEnvironment[ handler ], handler ) );
        }

        return hooks;
    },

    finish: function() {
        config.current = this;
        if( config.requireExpects && this.expected === null ) {
            this.pushFailure( "Expected number of assertions to be defined, but expect() was" + "not called.", this.stack );
        } else if( this.expected !== null && this.expected !== this.assertions.length ) {
            this.pushFailure( "Expected " + this.expected + " assertions,but " + this.assertions.length + " were run", this.stack );
        } else if( this.expected === null && !this.assertions.length ) {
            this.pushFailure( "Expected at least one assertion,but none were run - call " + "expect(0) to accept zero assertions.", this.stack );
        }

        var i,
            bad = 0;

        this.runtime = now() - this.started;
        config.stats.all += this.assertions.length;
        config.moduleStats.all += this.assertions.length;

        for( i = 0; i < this.assertions.length; i++ ) {
            if( !this.assertions[ i ].result ) {
                bad++;
                config.stats.bad++;
                config.moduleStats.bad++;
            }
        }

        runLoggingCallbacks( "testDone", {
            name: this.testName,
            module: this.module.name,
            skipped: !!this.skip,
            failed: bad,
            passed: this.assertions.length - bad,
            total: this.assertions.length,
            runtime: this.runtime,

            // HTML Reporter use
            assertions: this.assertions,
            testId: this.testId,

            // DEPRECATED: this property will be removed in 2.0.0, use runtime instead
            duration: this.runtime
        });

        // QUnit.reset() is deprecated and will be replaced for a new
        // fixture reset function on QUnit 2.0/2.1.
        // It's still called here for backwards compatibility handling
        QUnit.reset();

        config.current = undefined;
    },

    queue: function() {
        var bad,
            test = this;

        if( !this.valid() ) {
            return;
        }

        function run() {
            // each of these can by async  --这些可以通过异步
            synchronize([
                function() {
                    test.before();
                },

                test.hooks("beforeEach"),

                function() {
                    test.run();
                },

                test.hooks("afterEach").reverse(),

                function() {
                    test.after();
                },

                function() {
                    test.finish();
                }
            ]);
        }

        // 'bad' initialized at top of scope --顶部的“坏”初始化范围
        // defer when previous  test run passed, if storage is available --推迟前通过测试运行时,如果存储可用
        bad = QUnit.config.reorder && defined.sessionStorage &&
                +sessionStorage.getItem( "qunit-test-" + this.module.name + "-" + this.testName );

        if( bad ) {
            run();
        } else {
            synchronize( run, true );
        }
    },

    push: function( result, actual, expected, message ) {
        var source,
            details = {
                module: this.module.name,
                name: this.testName,
                result: result,
                message: message,
                actual: actual,
                expected: expected,  //预期的；预料的
                testId: this.testId,
                runtime: now() - this.started
            };

        if( !result ) {
            source = sourceFromStacktrace();

            if( source ) {
                details.source = source;
            }
        }

        runLoggingCallbacks( "log", details );

        this.assertions.push({
            result: !!result,
            message: message
        });
    },

    // actual 真实的，实际的；现行的，目前的
    pushFailure: function( message, source, actual ) {
        if( !this instanceof Test ) {
            throw new Error( "pushFailure() assertion outside test context, was " +
                sourceFromStacktrace( 2 ));
        }

        var details = {
            module: this.module.name,
            name: this.testName,
            result: false,
            message: message || "error",
            actual: actual || null,
            testId: this.testId,
            runtime: now() - this.started
        };

        if( source ) {
            details.source = source;
        }

        runLoggingCallbacks( "log", details );

        this.assertions.push({
            result: false,
            message: message
        });
    },

    resolvePromise: function( promise, phase ) {
        var then, message,
            test = this;
        if( promise != null ) {
            then = promise.then;
            if( QUnit.objectType( then ) === "function" ) {
                QUnit.stop();
                then.call(
                    promise,
                    QUnit.start,
                    function( error ) {
                        message = "Promise rejected " +
                            ( !phase ? "during" : phase.replace( /Each$/, "" )) +
                            " " + test.testName + ": " + ( error.message || error );
                        test.pushFailure( message, extractStacktrace( error, 0 ) );

                        // else next test will carry the responsibility
                        saveGlobal();

                        // Unblock
                        QUnit.start();
                    }
                );
            }
        }
    },

    valid: function() {
        var include,
            filter = config.filter,
            module = QUnit.urlParams.module && QUnit.urlParams.module.toLowerCase(),
            fullName = ( this.module.name + ": " + this.testName ).toLowerCase();

        // Internally-generated tests are always valid
        if( this.callback && this.callback.validTest ) {
            return true;
        }

        if( config.testId.length > 0 && inArray( this.testId, config.testId ) < 0 ) {
            return false;
        }

        if( module && ( !this.module.name || this.module.name.toLowerCase() !== module ) ) {
            return false;
        }

        if( !filter ) {
            return true;
        }

        include = filter.charAt( 0 ) !== "!";
        if( !include ) {
            filter = filter.toLowerCase().slice( 1 );
        }

        // If the filter matches, we need to honour include
        if( fullName.indexOf( filter ) !== -1 ) {
            return include;
        }

        // Otherwise, do the opposite
        return !include;
    }
};

// Resets the test setup. Useful for tests that modify the DOM. --重置测试设置。用于测试,修改DOM
/*
DEPRECATED: Use multiple tests instead of resetting inside a test.
Use testStart or testDone for custom cleanup.
This method will throw an error in 2.0, and will be removed in 2.1
*/
QUnit.reset = function() {
    // Return on non-browser environments
    // This is necessary to not break on node tests
    if( typeof window === "undefined" ) {
        return;
    }
}



});