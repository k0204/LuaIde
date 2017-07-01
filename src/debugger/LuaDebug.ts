/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
import {
	DebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent, Event,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { readFileSync } from 'fs';
import { basename } from 'path';
var fs = require('fs');
var ospath = require('path');
var os = require('os');
import { BreakPointData } from "./BreakPointData"
import { EventEmitter } from 'events';
import * as net from 'net';
import * as childProcess from 'child_process';
import { SocketClientState, Mode } from './DebugCommon';
import { LuaProcess, LuaDebuggerEvent } from './LuaProcess';
import { ScopesManager, LuaDebugVarInfo } from './ScopesManager';
import { BaseChildProcess } from "./childProcess/BaseChildProcess"
import child_process = require('child_process');
// import {  LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from '../luatool/TokenInfo';
// import {LuaParseTool} from '../luatool/LuaParseTool'
import { initConfig } from "../Common"
export class LuaDebug extends DebugSession {
	private luaProcess: LuaProcess;
	private breakPointData_: BreakPointData;
	private _breakpointId = 1000;
	private luaStartProc: child_process.ChildProcess;
	public fileExtname:string;
	public runtimeType: string;
	public localRoot: string;
	public isHitBreak: boolean = false

	public isProntToConsole: number;
	private scopesManager_: ScopesManager;
	private pathMaps: Map<string, Array<string>>;
	get breakPointData(): BreakPointData {
		return this.breakPointData_;
	}
	// private luaParseTool: LuaParseTool;
	public constructor() {
		super();
		this.fileExtname = ".lua"
		this.setDebuggerLinesStartAt1(true);
		this.setDebuggerColumnsStartAt1(false);
	}
	/**
	 * 初始化
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		this.sendEvent(new InitializedEvent());
		response.body.supportsConfigurationDoneRequest = true;
		response.body.supportsEvaluateForHovers = true;
		// response.body.supportsStepBack = true;
		//初始化断点信息
		this.breakPointData_ = new BreakPointData(this);

		this.sendResponse(response);
		this.pathMaps = new Map<string, Array<string>>()
		var luaDebug: LuaDebug = this;
		this.on("close", function () {
			luaDebug.luaProcess.close();
		})
	}
	protected setupProcessHanlders() {
		this.luaProcess.on('C2S_HITBreakPoint', result => {
			this.scopesManager_.setStackInfos(result.data.stack)
			this.sendEvent(new StoppedEvent('breakpoint', 1));
		})
		this.luaProcess.on('C2S_LuaPrint', result => {
			this.sendEvent(new OutputEvent(result.data.msg + "\n"))
		})

	}
	protected launchRequest(response: DebugProtocol.LaunchResponse, args: any): void {
		var result = initConfig(args)
		if (result != true) {
			this.sendErrorResponse(response, 2001, result);
			return
		}
		this.localRoot = args.localRoot
		this.isProntToConsole = args.printType
		this.runtimeType = args.runtimeType
		this.sendEvent(new OutputEvent("正在检索文件目录" + "\n"))
		this.initPathMaps(args.scripts)
		this.sendEvent(new OutputEvent("检索文件目录完成" + "\n"))
		this.isProntToConsole = args.printType
		var baseChildProcess = new BaseChildProcess(args, this)
		this.luaProcess = new LuaProcess(this, Mode.launch, args);
		this.scopesManager_ = new ScopesManager(this.luaProcess, this)
		//注册事件
		this.setupProcessHanlders()
		if (this.luaStartProc) {
			this.luaStartProc.kill()
		}
		this.sendResponse(response);
		this.luaStartProc = baseChildProcess.execLua()
		this.luaStartProc.on('error', error => {
			this.sendEvent(new OutputEvent("error:" + error.message));
		});
		
		// this.luaStartProc.on("data",function(data:string){
		// 	this.sendEvent(new OutputEvent(data ));
		// })
		this.luaStartProc.stderr.setEncoding('utf8');
		this.luaStartProc.stderr.on('data', error => {
			luadebug.sendEvent(new OutputEvent(error + "\n"))
		});
		var luadebug: LuaDebug = this;
		//关闭事件
		var self = this
		this.luaStartProc.on('close', function (code) {
			luadebug.sendEvent(new OutputEvent("close" + "\n"))
			if (baseChildProcess.childPid) {
				try {
					process.kill(baseChildProcess.childPid)
				}
				catch (e) {
					console.log('error..');
				}
			}
			if(self.runtimeType == "LuaTest"){
				luadebug.sendEvent(new TerminatedEvent());
			}
			
		});
	}
	protected attachRequest(response: DebugProtocol.AttachResponse, args: any): void {
		if(args.fileExtname != null){
			this.fileExtname = args.fileExtname
		}
		this.luaProcess = new LuaProcess(this, Mode.attach, args);
		this.scopesManager_ = new ScopesManager(this.luaProcess, this)
		this.localRoot = args.localRoot
		this.runtimeType = args.runtimeType
		this.isProntToConsole = args.printType
		this.sendEvent(new OutputEvent("正在检索文件目录" + "\n"))
		this.initPathMaps(args.scripts)
		this.sendEvent(new OutputEvent("检索文件目录完成" + "\n"))
		//注册事件
		this.setupProcessHanlders()
		this.sendResponse(response);
	}
	protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
		if (this.luaStartProc) {
			this.luaStartProc.kill()
		}
		super.disconnectRequest(response, args);
	}
	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		//初始化断点信息
		var path = args.source.path;
		var clientLines = args.lines;
		var breakpoints = this.breakPointData_.verifiedBreakPoint(path, clientLines)
		response.body = {
			breakpoints: breakpoints
		};
		if (this.luaProcess != null && this.luaProcess.getSocketState() == SocketClientState.connected) {
			var data = this.breakPointData_.getClientBreakPointInfo(path)
			//这里需要做判断 如果 是 断点模式 那么就需要 用mainSocket 进行发送 如果为运行模式就用 breakPointSocket
			this.luaProcess.sendMsg(LuaDebuggerEvent.S2C_SetBreakPoints, data, this.isHitBreak == true ? this.luaProcess.mainSocket : this.luaProcess.breakPointSocket);
		}
		this.sendResponse(response);
	}
	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(1, "thread 1")
			]
		};
		this.sendResponse(response);
	}
	/**
	 * Returns a fake 'stacktrace' where every 'stackframe' is a word from the current line.
	 */
	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
		var stackInfos: Array<any> = this.scopesManager_.getStackInfos()
		const frames = new Array<StackFrame>();
		for (var i = 0; i < stackInfos.length; i++) {
			var stacckInfo = stackInfos[i]
		}
		for (var i = 0; i < stackInfos.length; i++) {
			var stacckInfo = stackInfos[i];
			var path: string = stacckInfo.src;
			if (path == "=[C]") {
				path = ""
			} else {
				if (path.indexOf(this.fileExtname) == -1) {
					path = path + this.fileExtname;
				}
				path = this.convertToServerPath(path)
			}

			var tname = path.substring(path.lastIndexOf("/") + 1)
			var line = stacckInfo.currentline
		
			frames.push(new StackFrame(i, stacckInfo.scoreName,
				new Source(tname, path),
				line))
		}
		response.body = {
			stackFrames: frames,
			totalFrames: frames.length
		};
		this.sendResponse(response);
	}
	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		const scopes = this.scopesManager_.createScopes(args.frameId)
		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}
	protected variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): void {
		var luadebug: LuaDebug = this;
		var luaDebugVarInfo: LuaDebugVarInfo = this.scopesManager_.getDebugVarsInfoByVariablesReference(args.variablesReference)
		if (luaDebugVarInfo) {
			this.scopesManager_.getVarsInfos(args.variablesReference,
				function (variables) {
					response.body = {
						variables: variables
					};
					luadebug.sendResponse(response);
				});
		}
		else {
			this.sendResponse(response)
		}

	}
	/**
	 * 跳过 f5
	 */
	protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
		this.scopesManager_.clear()
		this.isHitBreak = false
		this.luaProcess.sendMsg(LuaDebuggerEvent.S2C_RUN,
			{
				runTimeType: this.runtimeType,
			})
		this.sendResponse(response);
	}
	/**
	 * 单步跳过
	 */
	protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
		this.scopesManager_.clear()
		var luadebug: LuaDebug = this;
		// this.sendEvent(new OutputEvent("nextRequest 单步跳过-->"))
		// if (this.scopesManager_) {
		// 	this.sendEvent(new OutputEvent("scopesManager_ not null"))
		// } else {
		// 	this.sendEvent(new OutputEvent("scopesManager_ null"))
		// }
		function callBackFun(isstep, isover) {
			// luadebug.sendEvent(new OutputEvent("nextRequest 单步跳过"))
			// luadebug.sendEvent(new OutputEvent("isstep:" + isstep))
			if (isstep) {
				luadebug.sendEvent(new StoppedEvent("step", 1));
			}
		}
		try {
			this.scopesManager_.stepReq(callBackFun, LuaDebuggerEvent.S2C_NextRequest)
		} catch (error) {
			this.sendEvent(new OutputEvent("nextRequest error:" + error))
		}
		this.sendResponse(response);
	}
	/**
	 * 单步跳入
	 */
	protected stepInRequest(response: DebugProtocol.StepInResponse): void {
		this.scopesManager_.clear()
		var luadebug: LuaDebug = this;
		this.scopesManager_.stepReq(function (isstep, isover) {
			if (isover) {
				this.sendEvent(new TerminatedEvent());
				return
			}
			if (isstep) {
				luadebug.sendEvent(new StoppedEvent("step", 1));
			}
		}, LuaDebuggerEvent.S2C_StepInRequest)
		luadebug.sendResponse(response);
	}
	protected pauseRequest(response: DebugProtocol.PauseResponse): void {
		this.sendResponse(response);
		// this.rubyProcess.Run('pause');
	}
	protected stepOutRequest(response: DebugProtocol.StepInResponse): void {
		this.sendResponse(response);
		var luadebug: LuaDebug = this;
		this.scopesManager_.stepReq(function (isstep, isover) {
			if (isover) {
				this.sendEvent(new TerminatedEvent());
				return
			}
			luadebug.sendResponse(response);
			if (isstep) {
				luadebug.sendEvent(new StoppedEvent("step", 1));
			}
		}, LuaDebuggerEvent.S2C_StepOutRequest)
		//Not sure which command we should use, `finish` will execute all frames.
		// this.rubyProcess.Run('finish');
	}
	/**
	 * 获取变量值
	 */
	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		var luadebug: LuaDebug = this;
		var frameId = args.frameId;
		if (frameId == null) {
			frameId = 0;
		}
		var expression = args.expression;
		var eindex = expression.lastIndexOf("..")
		if (eindex > -1) {
			expression = expression.substring(eindex + 2)
		}
		eindex = expression.lastIndexOf('"')
		if (eindex == 0) {
			var body = {
				result: expression + '"',
				variablesReference: 0
			}
			response.body = body
			luadebug.sendResponse(response);
			return
		}
		if (args.context == "repl" && args.expression == ">load") {
			// this.luaProcess.runLuaScript({ luastr: getLoadLuaScript(), frameId: args.frameId }, function (body) {
			// 	response.body = body
			// 	luadebug.sendResponse(response);
			// })
			return
		}
		var index: number = 1
		var scopesManager = this.scopesManager_;
		var callBackFun = function (body) {
			if (body == null) {
				index++;
				if (index > 3) {
					response.body =
						{
							result: "nil",
							variablesReference: 0
						}
					luadebug.sendResponse(response);
				} else {
					scopesManager.evaluateRequest(frameId, expression, index, callBackFun, args.context)
				}
			} else {
				response.body = body;
				luadebug.sendResponse(response);
			}
		}
		this.scopesManager_.evaluateRequest(frameId, expression, index, callBackFun, args.context)
	}
	public convertToServerPath(path: string): string {
		if (path.indexOf('@') == 0) {
			path = path.substring(1);
		}
		path = path.replace(/\\/g, "/");
		path = path.replace(new RegExp("/./", "gm"), "/")
		var nindex: number = path.lastIndexOf("/");
		var fileName: string = path.substring(nindex + 1)

		fileName = fileName.substr(0,fileName.length - 4) + this.fileExtname;
		path = path.substr(0,path.length - 4)  + this.fileExtname;

		var paths: Array<string> = this.pathMaps.get(fileName)
		if (paths == null) {
			return path
		}
		var clientPaths = path.split("/")

		var isHit: boolean = true
		var hitServerPath = ""
		var pathHitCount: Array<number> = new Array<number>();
		for (var index = 0; index < paths.length; index++) {
			var serverPath = paths[index];
			pathHitCount.push(0)
			var serverPaths = serverPath.split("/");
			var serverPathsCount = serverPaths.length
			var clientPathsCount = clientPaths.length;
			while (true) {


				if (clientPaths[clientPathsCount--] != serverPaths[serverPathsCount--]) {
					isHit = false
					break;
				} else {
					pathHitCount[index]++;
				}
				if (clientPathsCount <= 0 || serverPathsCount <= 0) {
					break
				}
			}
		}
		//判断谁的命中多 

		var maxCount = 0
		var hitIndex = -1
		for (var j = 0; j < pathHitCount.length; j++) {
			var count = pathHitCount[j];
			if (count >= maxCount && count > 0) {
				hitIndex = j
				maxCount = count
			}
		}
		if (hitIndex > -1) {
			return paths[hitIndex]
		}


	}





	public convertToClientPath(path: string, lines: Array<number>): any {
		path = path.replace(/\\/g, "/");
		var nindex: number = path.lastIndexOf("/");
		var fileName: string = path.substring(nindex + 1)
		var extname = ospath.extname(path)
		var baseName = ospath.basename(path)
		fileName = fileName.substr(0,fileName.length - extname.length) + ".lua";
		path = path.substr(0,path.length - extname.length) + ".lua";
		var pathinfo = {
			fileName: fileName,
			serverPath: path,
			lines: lines
		}
		return pathinfo
		//检查文件是否存在如果存在那么就
		// var paths: Array<string> = new Array<string>();
		// var clientPath: string = ""
		// for (var index = 0; index < this.scriptPaths.length; index++) {
		// 	var serverPath: string = this.scriptPaths[index];
		// 	if (path.indexOf(serverPath) > -1) {
		// 		clientPath = path.replace(serverPath, "")
		// 		paths.push(clientPath)
		// 	}
		// }
		// return paths;
	}

	private initPathMaps(scripts: Array<string>) {
		var paths: Array<string> = new Array<string>();
		if (scripts) {
			for (var index = 0; index < scripts.length; index++) {
				var scriptPath = scripts[index]
				scriptPath = scriptPath.replace(/\\/g, "/");
				if (scriptPath.charAt(scriptPath.length - 1) != "/") {
					scriptPath += "/"
				}
				paths.push(ospath.normalize(scriptPath))
			}
		}
		paths.push(ospath.normalize(this.localRoot))

		function sortPath(p1, p2) {
			if (p1.length < p2.length) return 0
			else return 1
		}
		paths = paths.sort(sortPath);
		var tempPaths: Array<string> = Array<string>();
		tempPaths.push(paths[0])
		for (var index = 1; index < paths.length; index++) {
			var addPath = paths[index];
			var isAdd = true
			for (var k = 0; k < tempPaths.length; k++) {
				if (addPath == tempPaths[k] || addPath.indexOf(tempPaths[k]) > -1 || tempPaths[k].indexOf(addPath) > -1) {
					isAdd = false
					break;
				}
			}
			if (isAdd) {
				tempPaths.push(addPath)
			}
		}

		this.pathMaps.clear();
		for (var k = 0; k < tempPaths.length; k++) {
			this.readFileList(tempPaths[k])
		}
	}


	private readFileList(path: string) {
		if (path.indexOf(".svn") > -1) {
			return
		}
		path = path.replace(/\\/g, "/");
		if (path.charAt(path.length - 1) != "/") {
			path += "/"
		}
		var files = fs.readdirSync(path);
		for (var index = 0; index < files.length; index++) {

			var filePath = path + files[index];

			var stat = fs.statSync(filePath);
			if (stat.isDirectory()) {
				//递归读取文件
				this.readFileList(filePath)
			} else {
				if (filePath.indexOf(this.fileExtname) > -1) {


					var nindex: number = filePath.lastIndexOf("/");
					var fileName: string = filePath.substring(nindex + 1)
					var filePaths: Array<string> = null
					if (this.pathMaps.has(fileName)) {
						filePaths = this.pathMaps.get(fileName)
					} else {
						filePaths = new Array<string>();
						this.pathMaps.set(fileName, filePaths);

					}
					filePaths.push(filePath)
				}
			}
		}
	}
}




DebugSession.run(LuaDebug);