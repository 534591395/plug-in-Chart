(function(){
	"use strict";

	var root = this;

	var root = this,
	    previous = root.Chart;

	var Chart = function(context){
		//初始化上下文
		var chart = this;
		this.canvas = context.canvas;

		this.ctx = context;

        //获取尺寸 --offset  和 defaultView
		var computeDimension = function(element,dimension){
			if(element['offset'+dimension]){
				return element['offset'+dimension];
			} else {
				//document.defaultView 获取元素css属性
				return document.defaultView.getComputedStyle(element).getPropertyValue(dimension);
			}
		};

		var width = this.width = computeDimension(context.canvas,'Width') || context.canvas.width;
		var height = this.height - computeDimension(context.canvas,'Height') || context.canvas.height;

		context.canvas.width = width;
		context.canvas.height = height;

		width = this.width = context.canvas.width;
		height = this.height = context,canvas.height;
		//屏幕高宽比
		this.aspectRatio = this.width / this.height;

		return this;
	}; 

    Chart.defaults = {};

    Chart.types = {};

    var helpers = Chart.helpers = {};

    //loopable 要遍历的对象（元素，数组，{}）
    //callback 回调函数 function(item,i){}
    //slef 上下文
        //遍历
    var each = helpers.each = function(loopable,callback,self){
	    	//additionalArgs 额外的参数
	    	var additionalArgs = Array.prototype.slice.call(arguments, 3);
	    	if(loopable){
	    		if(loopable.length === +loopable.length){
	    			var i;
	    			for(i=0; i<loopable.length; i++){
	    				callback.apply(self,[loopable[i],i].concat(additionalArgs));
	    			}
	    		} else {
	    			for(var item in loopable){
	    				callback.apply(self,[loopable[item],item].concat(additionalArgs));
	    			}
	    		}
	    	}
       },
       //复制
       clone = helpers.clone = function(obj){
       	    var objClone = {};
       	    each(obj,function(value,key){
       	    	if(obj.hasOwnProperty(key)){
       	    		objClone[key] = value;
       	    	}
       	    });
       	    return objClone;
       },
       //扩展
       extend = helpers.extend = function(base){
       	    //extensionObject 外延对象 --扩展的
       	    each(Array,prototype.slice.call(arguments,1), function(extensionObject){
       	    	each(extensionObject,function(value,key){
       	    		if(extensionObject.hasOwnProperty(key)){
       	    			base[key] = value;
       	    		}
       	    	});
       	    });
       	    return base;
       },
       //合并
       merge = helpers.merge = function(base,master){
       	    var args = Array.prototype.slice.call(arguments,0);
       	    args.unshift({});
       	    return extend.apply(null,args);
       },
       //返回数组元素所在的位置，确定是否包含在里面
       indexOf = helpers.indexOf = function(arrayToSearch, item){
       	    if(Array.prototype.indexOf) {
       	    	return arrayToSearch.indexOf(item);
       	    } else {
       	    	for(var i = 0; i < arrayToSearch.length; i++){
       	    		if(arrayToSearch[i] === item ) return i;
       	    	}
       	    	return -1;
       	    }
       },
       //集合中查找，返回结果（集合）
       where = helpers.where = function(collection,filterCallback){
       	    var filtered = [];
       	    helpers.each(collection,function(item){
       	    	if(filterCallback(item)){
       	    		filtered.push(item);
       	    	}
       	    });
       	    return filtered;
       },
       findNextWhere = helpers.findNextWhere = function(arrayToSearch,filterCallback,startIndex){
       	    if(!startIndex){
              startIndex = -1;
            }
            for(var i = startIndex + 1; i < arrayToSearch.length; i++){
              var currentItem = arrayToSearch[i];
              if(filterCallback(currentItem)){
                return currentIem;
              }
            }
       },
       findPreviousWhere = helpers.findPreviousWhere = function(arrayToSearch,filterCallback,startIndex){
            if(!startIndex){
              startIndex = arratToSearch.length;
            }
            for(var i = startIndex-1; i >= 0; i--){
              var currentItem = arrayToSearch[i];
              if(filterCallback(currentItem)){
                return currentItem;
              }
            }
       },
       inherits = helpers.inherits = function(extensions){
            var parent = this;
            var ChartElement = (extensions && extensions.hasOwnProperty("constructor")) ? extensions.constructor : function(){ return parent.apply(this, arguments); };

            var Surrogate = function(){ this.constructor = ChartElement; };
            Surrogate.prototype = parent.prototype;
            ChartElement.prototype = new Surrogate();

            ChartElement.extend = inherits;
            if(extensions) extend(ChartElement.prototype, extensions);

            ChartElement.__super__ = parent.prototype;

            return ChartElement;
       },
       noop = helpers.noop = function(){},
       uid = helpers.uid = (function(){
           var id = 0;
           return function(){
               return "chart-" + id++;
           };
       })(),
       warn = helpers.warn = function(str){
           if(window.console && typeof window.console.warn === "function") console.warn(str);
       },
       amd = helpers.amd = (typeof define === 'function' && define.amd),
       isNumber = helpers.isNumber = function(n){
           //是数字且是有限数字（包括可转换）
           return !isNaN(parseFloat(n)) && isFinite(n) ;
       },
       max = helpers.max = function(array){
           return Math.max.apply( Math, array );
       },
       min = helpers.min = function(array){
           return Math.min.apply( Math,array );
       },
       //获取值之间的范围。 cap(1001, 100, 5) == 100; cap(1, 100, 5) == 5; cap(8, 100, 5) == 8;
       cap = helpers.cap = function(valueToCap,maxValue,minValue){
           if(isNumber(maxValue)){
                if( valueToCap > maxValue ) {
                    return maxValue;
                }
           } else if(isNumber(minValue)){
               if( valueToCap < minValue ){
                  return minValue;
               }
           }
           return valueToCap;
       },
       //获取小数部分有几位
       getDecimalPlaces = helpers.getDecimalPlaces = function(num){
           //num%1 == 0 判断是否为小数
           if(num%1!==0 && isNumber(num)){
              var s = num.toString();
              if(s.indexOf("e-") < 0){
                 return s.split(".")[1].length;

              } else if(s.indexOf(".") < 0){
                 return parseInt(s.split("e-")[1]);
              } else {
                 var parts = s.split(".")[1].split("e-");
                 return parts[0].length + parseInt(parts[1]);
              }
           } else {
                return 0;
           }
       },
       //转换为弧度
       toRadians = helpers.toRadians = function(degress){
            
       }




	
}).call(this);