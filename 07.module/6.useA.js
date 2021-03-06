// let r = require('./a');
// console.log(this) // => {}
// console.log(r);
const a = 1;
const b = 2;
function sum(x,y){
    return x+y;
}
sum(a,b)

/*
** 1. 掌握node中如何实现代码调试
*/ 
// https://nodejs.org/en/docs/inspector
// 1.1.可以在浏览器中进行调试 （调试某些模块可以使用这种方式） node --inspect-brk 文件名来解析，打开浏览器，输入chrome://inspect，点击打开DevTools
// 1.2.直接使用webstorm 和 vscode 自带调试方式  直接通过左边小三角，创建launch.json 进行调试
// 1.3.在控制台中调试 



/*
** 分析CommonJS的node源码
*/

// 1.会默认调用require语法
// 2.Module.prototype.require 模块的原型上有require方法
// 3.Module._load 调用模块的加载方法  最终返回的是module.exports
// 4.Module._resolveFilename 解析文件名 将文件名变成绝对路径 默认尝试添加 .js / .json /.node
// 5.Module._cache 默认会判断是否存在缓存
// 6.new Module 创建模块(对象)   id ,exports
// 7.把模块缓存起来，方便下次使用
// ______________________ 根据文件名（绝对路径） 创建一个模块
// 8.tryModuleLoad 尝试加载模块   module.load
// 9.module.paths 第三方模块查找的路径
// 10.获取当前模块的扩展名  根据扩展名调用对应的方法Module._extensions 策略模式
// 11.获取文件的内容
// 12.调用module._compile 方法
// 13.将用户的内容 包裹到一个函数中  (function (exports, require, module, __filename, __dirname) {})

// 最终返回的是module.exports  用户会给这个module.exports进行赋值
const path = require('path');
const fs = require('fs');
const vm = require('vm');


/*
**  6.new Module 创建模块(对象)   id是唯一属性 ,exports，空对象
**    创建新对象，id和空exports
*/
function Module(id) {
    this.id = id;
    this.exports = {};
}

/*
** 13.将用户的内容 包裹到一个函数中  (function (exports, require, module, __filename, __dirname) {})
** 把内容包装成函数，函数头 + 字符串体，返回字符串
*/
Module.wrap = function (script) {
    let arr = [
        ' (function (exports, require, module, __filename, __dirname) {',
        script,
        '})'
    ]
    return arr.join('')
}

/*
** 10.获取当前模块的扩展名  根据扩展名调用对应的方法Module._extensions 策略模式
**     定义很多策略（后缀），根据不同策略加载JS
*/
Module._extensions = {
    '.js': function(module) {
        let content = fs.readFileSync(module.id,'utf8');
        let fnStr = Module.wrap(content);  // 13.把内容包装成函数，返回一个函数字符串
        let fn = vm.runInThisContext(fnStr);  // 产生一个函数
        let exports = module.exports;
        let require = myRequire;
        let __filename = module.id;
        let __dirname = path.dirname(module.id); // 当前文件目录
        // 这里的this 就是exports对象
        fn.call(exports, exports, require, module, __filename, __dirname);
        // 用户会给module.exports 赋值
    },
    '.json': function(module) {
        let content = fs.readFileSync(module.id,'utf8'); // 根据路径，读取出来的是字符串
        module.exports = JSON.parse(content);
    }
}

/*
** 4.Module._resolveFilename 解析文件名 将文件名变成绝对路径 默认尝试添加 .js / .json /.node
*/
Module._resolveFilename = function(filepath) {
    // 根据当前路径实现解析，转成绝对路径
    let filePath = path.resolve(__dirname, filepath);
    // 判断当前面文件是否存在
    let exists = fs.existsSync(filePath);
    if (exists) return filePath; // 如果存在直接返回路径
    // 尝试添加后缀
    let keys = Object.keys(Module._extensions);  /* 调用 10 */
    for (let i = 0; i < keys.length; i++) {
        let currentPath = filePath + keys[i];
        if (fs.existsSync(currentPath)) { // 尝试添加后缀查找
            return currentPath;
        }
    }
    throw new Error('模块不存在')
}

/*
** 8.tryModuleLoad 尝试加载模块   module.load，模块上的方法，模块原型上的方法
*/
Module.prototype.load = function(filename) {
    let extname = path.extname(filename);  // 获取文件的后缀来进行加载
    Module._extensions[extname](this); // 根据对应的后缀名，进行加载
}
Module.cache = {};

/*
** 3.Module._load 调用模块的加载方法  最终返回的是module.exports
** 4.Module._resolveFilename 解析文件名 将文件名变成绝对路径 默认尝试添加 .js / .json /.node
** 5.Module._cache 默认会判断是否存在缓存
** 6.new Module 创建模块(对象)   id ,exports
** 7.把模块缓存起来，方便下次使用
** 8.tryModuleLoad 尝试加载模块   module.load
*/
Module._load = function(filepath) {
    // 4.将路径转化成绝对路径
    let filename = Module._resolveFilename(filepath);  
    // 5.获取路径后不要立即创建模块，先看一眼能否找到以前加载过的模块
    let cacheModule = Module.cache[filename];
    console.log(cacheModule);
    if(cacheModule){
        return cacheModule.exports; // 直接返回上一次require的结果
    }
    // 保证每个模块的唯一性，需要通过唯一路径进行查找
    // 6.创建新对象
    let module = new Module(filename); // 实例中有id, exports对应的就是当前模块的结果
    Module.cache[filename] = module
    // 8. module.load方法
    module.load(filename);
    return module.exports;
}

/*
** 2.Module.prototype.require 模块的原型上有require方法
** 3.Module._load 调用模块的加载方法  最终返回的是module.exports
*/
function myRequire(filepath) {
    return Module._load(filepath)   // 根据路径加载这个模块
}

/* 
** 1.会默认调用require语法
*/
setInterval(() => {
    let r = myRequire('./a.js');  // myRequire = require 自己实现的
    console.log(r,'----');
}, 1000);



// 1.require语法是同步的，fs.readFileSync
// 2.最终require语法返回的是module.exports
// 3.模块的exports 和 module.exports 引用的是同一个变量
// 4.模块是"动态"加载每次require都会获取最新的导出的结果,可以将require写到条件中
// 5.更改exports的引用 不会导致module.exports变化
// 6.循环引用，一般不会出现，如果出现只能加载部分数据


// 整体思路：
// 加载模块 => 把文件名变成绝对路径 => 进行一个模块的创建 => 加载 => 模块中有个一exports属性 => 最终返回exports



