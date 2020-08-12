// 完善then 等promise中的异步执行完 执行

let Promise = require('./promise')
let promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        reject("不成功")
    }, 1000);
});
// promise主要用来处理异步调用问题
// 1.promise调用then方法时可能当前的promise中有异步代码，还没有执行成功，状态是pending，没成功没失败，then中什么都不执行
// 2.解决1的方法：异步相关，发布订阅模式 如果当前状态是pending时 我们需要将成功的回调和失败的回调存放起来，稍后调用resolve和reject的时候重新执行

// 且 then 可以多次

promise.then((data) => {
    console.log('success1', data)
}, (err) => {
    console.log('faild2', err)
})

promise.then((data) => {
    console.log('success1', data) 
}, (err) => {
    console.log('faild2', err)
})