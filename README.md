
# LuaIde 
1. author:kangping  
1. luaIde 是基于vscode开发的一款用于lua语言开发者使用的插件  
1. 目标:致力于做最好的lua开发工具  
1. 更新:luaide 个人开发者开发 持续更新  
1. 是否开源:开源
1. 平台支持:win,mac  

#重要提示
1. 由于上传了源码 所以原来下载 LuaDebug 的地址由 lua/LuaDebug.lua 修改为 luaDebug/LuaDebug.lua  
2. 由于网络原因 github 在家里不是很稳定所以版本库没有在github 中,github 中的代码会随着版本发布同步更新, 如果发现bug的同学,并进行了修改. 我会根据情况来同步到最新版本.
#下一版本 修改内容
1. 修改模板文件及模板方法的bug
2. 添加非.lua 文件 的配置方法
3. 修改控制台输出方式

#更新记录

1. 0.1.7
	1. 添加显示介绍配置 luaide.isShowDest 默认为false 只显示一次,如需重复显示修改为true
	2. 修改代码格式化 换行处理 和 " 转义 bug
	3. 修改代码提示  function  方法中 定义的local 变量 无法提示 二级变量 的bug
	4. 添加数据统计接口 统计在线人数, 如果有反感这一行为的请联系我,后期考虑添加配置
	5. 优化debug  将 lua 和luajit 调试文件进行分离 coocs 和unity 如果使用luajit 的调试文件请使用luaDebugjit.lua 文件进行调试  调试文件地址为luadeubg/LuaDebug.lua or luadebug/Luadebugjit.lua
	 

1. 0.1.6 修改代码格式化bug   
1. 将源代码提交至github 


#注意: 0.1.0 版本改动比较大请删除.vscode/launch.json 文件 重写生成调试文件  
#qq群 494653114
# luaDebug/LuaDebug.lua [下载地址](https://github.com/k0204/LuaIde) 
# 文档请直接查看[wiki](https://github.com/k0204/LuaIde/wiki) 

# 捐献      
如果你想支持LuaIde 的开发 可以通过微信 扫下面的二维码进行支持
![IDE](https://coding.net/u/k0204/p/imgres/git/raw/master/money.png)
