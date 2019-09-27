// 创建应用

const Application = require('./application')
const Router = require('./router/index')

function createApplication(){
    // 创建 应用 核心就是new Application
    return new Application
}
createApplication.Router = Router; // 将Router构造函数挂载到app上，因为是构造函数，所以既可以new，也可以直接调用
module.exports = createApplication
