# LuaIde
* author:kangping
* version:0.0.4

# 介绍
## luaIde  致力于做最好的lua开发工具(个人开发者 利用空余时间进行开发速度更新速度不会很快,但保证会一直更新.) 

#捐献 
##如果你想支持LuaIde 的开发 可以通过微信 扫下面的二维码进行支持
![IDE](https://coding.net/u/k0204/p/imgres/git/raw/master/money.png)

#命令:
*       插件中的所以命令都设置的快捷键 如果需要修改快捷键 请到 文件->首选项->键盘快捷方式 中进行修改
*       "luaide.changecase.toUpperCase" 		转换为大写 CTRL+L CTRL+U
*       "luaide.changecase.toLowerCase" 		转换为小写  CTRL+L CTRL+L
*       luaide.utils.createModuleFunction 		创建模块方法 CTRL+L CTRL+T
*       luaide.utils.createFunction 			创建方法  CTRL+L CTRL+F
*       luaide.utils.createTemplateFile 		创建模板文件 CTRL+L CTRL+M
*       luaide.utils.LoadLuaScript				动态加载lua代码 CTRL+L CTRL+E
*       
#使用方法
* 1.下载luaide 
* 2.下载后启用插件,将脚本文件夹拖入vscode 

#Bug 反馈
	* 反馈地址:https://www.bugclose.com/login.html
	* 公用账号:luaide@luaide.com 
	* 密码: luaide
	* ===============================
	* 邮箱:1471768133@qq.com
	* qq群:494653114
	* 遇见任何问题请加群询问
#LuaDebug 
* 注意事项 (由于本调试器是存lua 编写不修改任何c++ 程序 理论上使用任何lua程序调试而不用做任何修改)
	* 断点是 如果 设置断点行 为 local test = nil  那么将不会命中断点 这是由lua解析器决定的 所以请注意
	* 由此会出现一个比较麻烦的事情就是 运行效率没有修改c++程序 或者某些采用dll 注入技术来的高效 本人已经做了
	比较多的优化策略保证调试效率 后期也会进一步的优化现在的效率已经在能够接受的范围内了.(在调试时设置的断点越少
	那么需要检查的就越少.速度越高 如果不需要进行的调试时可以直接禁用断点这样lua 程序就以正常模式在运行 当设置断点
	后 进入hook 模式.)
* 支持 
		*lua 本版本的调试器为试用版本 发布出来的目的是搜集更多的反馈从而进一步优化调试.有任何优化意见请提交至反馈地址或者加qq群进行反馈
	* luaIde 中的debug 是通过luaSocket 进行数据通信的所以 请确保你的lua库中有luasocket支持
	* local breakInfoFun = require("LuaDebug")("192.168.1.102", 7003)
		*1.breakInfoFun 为断点更新函数 提供该函数的目的是为了尽可能地优化调试速度 当调试器中没有断点或者
		  禁用断点时调试器会不做任何断点检测.从而优化调试速度 
		*2. 如果为移动设备调试请确保调试器和移动设备在同一网络中 不然运行时无法访问调试服务器从而调试失败  
	* 游戏引擎(支持移动设备调试)
		* cocos(包括quick)
			* 示例:
				* local breakInfoFun = require("LuaDebug")("192.168.1.102", 7003)
					CCDirector:sharedDirector():getScheduler():scheduleScriptFunc(breakInfoFun, 0.3, false
				*breakInfoFun 为断点更新函数由于
		* unity -ulua 
			* 由于unity 的lua版本众多第一个版本现在只支持了ulua后期会支持更多的 unity lua版本
			* ulua 需要手动打开luasocket
			![IDE](https://coding.net/u/k0204/p/imgres/git/raw/master/uluaSocket.png)
			*在OpenLibs 方法中调用OpenLuaSocket();
		* lua51(内置)
	*如何调试
		* lua51 配置
			* 
		
##版本更新记录

* 0.0.4 
*       1.修改前一版本对lua 语言文件的判断 当有多种语言同时编写是会 错误的检查不该检查的语言
*       2.增加了多方法参数的提示 并进行作用于检查 当只有在当前作用于的方法参数 才会提示 不是本方法的参数不会进行提示 提高的提示的准确性
*       3.修改一系列错误的 语法检查
*       4.添加代码啊格式化功能  "editor.formatOnSave": true 在配置中设置该属性后编辑器会在保存时自动进行格式化处理
*      5.优化lua配置
*      
     ![IDE](https://coding.net/u/k0204/p/imgres/git/raw/master/luaConfig.png)
	
* 0.0.3 
*       1.优化代码提示
*       2.去除掉代码提示中重复的选项值保留一项
*       3.代码提示机制修改 更改module 名来进行查找 不区分大小写
*       4.优化self 的提示  对应module 
*       5 优化转定义 尽可能的找到正确的 定义 注意 这只是一种匹配机制 不能100%的正确
*           5.1.转到module 会转到第一个 module方法定义的地方 
*           5.2.转到方法 会转到具体的方法定义 如果有多个方法名相同的方法 会转到第一个
*           5.3.转到self.f1.f2   如果f1 与一个module名相同转到module中 否则寻找代码中第一次出现的地方
*       6.大小写转换 --> 
*           6.1 大写CTRL+L CTRL+U
*           6.2 小写CTRL+L CTRL+L 
*       7. 优化 function Symbol ctrl+shift+o 能够更清楚的显示function 属于 哪个代码块中以及function 的代码范围 
*       8.快速 module 创建方法-->  CTRL+L CTRL+M
*       9.快速创建方法 CTRL+L CTRL+F
*       10.加入模板文件 CTRL+L CTRL+T 
    *      模板文件 (https://coding.net/u/k0204/p/imgres/git/blob/master/Template.lua)
    *      配置项 针对 模板请注意 需要在 文件->首选项-> 用户设置 或者 工作区设置中 进行进行设置


           
          
* 0.0.2 优化转定义 
*       
* 0.0.1 初次提交



