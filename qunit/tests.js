 //获取实际尺寸
var computeDimension = function(element,dimension){
    if(element['offset'+dimension]){
        return element['offset'+dimension];
    } else {
        return document.defaultView.getComputedStyle(element).getPropertyValue(dimension);
    }
};

test('computeDimension',function(){
    var width = computeDimension(document.getElementById('canvasdd'),'Width');
    var height = computeDimension(document.getElementById('canvasdd'),'Height')
    equal(width,300);
    equal(height,400);
});

//遍历
var each = function(loopable,callback,self){
    var additionalArgs = Array.prototype.slice.call(arguments, 3);
    if(loopable){
        if(loopable.length === +loopable.length){
            var i;
            for(i=0;i<loopable.length;i++){
                callback.apply(self,[loopable[i],i].concat(additionalArgs));
            }
        } else {
            for(var item in loopable){
                callback.apply(self,[loopable[item],item].concat(additionalArgs));
            }
        }
    }
}

test('each',function(){
    var dateArray = [10,20,30];
    var arr = [];
    var dateObject = {object:[{'dd':1}],func:function(){console.log()}};
    var obj = {};
    each(dateArray,function(item,i){
        arr.push(item);
    });

    each(dateObject,function(value,item){
        obj[item] = value;
    });

    ok(arr.length,3);
    ok(arr[2],30);

    ok( (typeof obj['func']) == 'function' );
});

//复制
var clone = function(obj){
    var cloneObj = {};
    each(obj,function(value,key){
        if(obj.hasOwnProperty(key)){
            cloneObj[key] = value;
        }
    });

    return cloneObj;
};

test('clone',function(){
    var targetObj = {object:'test',func:function(){}};
    var obj = '';
    obj = clone(targetObj);
    ok( targetObj , obj ) ;   
    equal(targetObj['object'] , obj['object']);
});

//扩展
//使用方式  extend(Obj.prototype,{clone:function(){}});
var extend = function(base){
    each(Array.prototype.slice.call(arguments,1),function(extensionObject){
        each(extensionObject,function(value,key){
            if(extensionObject.hasOwnProperty(key)){
                base[key] = value;
            }
        });
    });
    return base;
};

test('extend',function(){
    var Person = function(){};
    var Jim = {height:function(){}};
    extend(Person.prototype,Jim);
    var JimObj = new Person();
    ok( typeof JimObj.height == 'function' ); 
});

//合并  merge
var merge = function(base,master){
    var args = Array.prototype.slice.call(arguments,0);
    args.unshift({});
    return extend.apply(null,args);
};

test('merge',function(){
    var base = {obj:'acbv'};
    var master = {func:function(){}};
    var newObj = merge(base,master);

    ok( typeof newObj.func == 'function' );
});


//返回所在的位置，确定是否包含在里面
var indexOf = function(arrayToSearch,item){
    if(Array.prototype.indexOf){
        return arrayToSearch.indexOf(item);
    } else {
        for(var i = 0; i < arrayToSearch.length; i++){
            if(arrayToSearch[i] === item) return i;
        }
        return -1;
    }
};

test('indexOf',function(){
    var arrayToSearch = ['a','d','f'];
    ok( indexOf(arrayToSearch,'d') > -1 );
});

//where
var where = function(collection,filterCallback){
    var filtered = [];
    each(collection,function(item){
        if(filterCallback(item)){
            filtered.push(item);
        }
    });
    return filtered;
};

test('where',function(){
    var collection = [{first:'1'},{first:'2'},{first:'3'}];
    function filterCallback(item){
        return item.first == 2;
    }
    ok( where(collection,filterCallback).length >0 );
});

//查找下一个
var findNextWhere = function(arrayToSearch,filterCallback,startIndex){
    if(!startIndex){
        startIndex = -1;
    }
    for(var i = startIndex +1; i < arrayToSearch.length; i++){
        var currentItem = arrayToSearch[i];
        if(filterCallback(currentItem)){
            return currentItem;
        }
    }
}

//查找前一个
var findPreviousWhere = function(arrayToSearch,filterCallback,startIndex){
    if(!startIndex){
        startIndex = arrayToSearch.length;
    }
    for(var i = startIndex-1; i >= 0; i--){
        var currentItem = arrayToSearch[i];
        if(filterCallback(currentItem)){
            return currentItem;
        }
    }
}

test('findXWhere',function(){
    var arrayToSearch = ['a','f','d','h','k'];
    var next  = findNextWhere(arrayToSearch,function(currentItem){ return currentItem == 'k'; },1);
    equal(next,'k');

    var previous = findPreviousWhere(arrayToSearch,function(currentItem){ return currentItem == 'f' }, 3);
    equal(previous, 'f');
});

var isNumber = function(n){
    return !isNaN(parseFloat(n)) && isFinite(n);
}

var cap = function(valueToCap,maxValue,minValue){
    if(isNumber(maxValue)){
        if(valueToCap > maxValue){
            return maxValue;
        } else if(valueToCap < minValue){
            return minValue;
        }
        return valueToCap;
    }
}

test('cap',function(){
    ok( cap(1001, 100, 5) == 100 );
});

//获取小数部分有几位
var getDecimalPlaces  = function(num){
    if(num%1 !== 0 && isNumber(num)){
        var s = num.toString();
        if(s.indexOf("e-") < 0 ){
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
}

test('getDecimalPlaces',function(){
    var array = [0.01,1e-9,1.23e-9];
    equal(getDecimalPlaces(array[0]),2);
    equal(getDecimalPlaces(array[1]),9);
    equal(getDecimalPlaces(array[2]),11);
});