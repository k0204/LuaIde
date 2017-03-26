import { EventEmitter } from 'events';
import * as net from 'net';
import * as childProcess from 'child_process';
import { SocketClientState, Mode } from './Common';
import { LuaDebug } from './LuaDebug';
var path = require('path');
var fs = require('fs');

import {
    DebugSession,
    InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent, Event,
    Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';

export class LuaDebuggerEvent {
    public static S2C_SetBreakPoints = 1

    /**断点设置成功 */
    public static C2S_SetBreakPoints = 2
    public static S2C_RUN = 3
    /**命中断点 */
    public static C2S_HITBreakPoint = 4

    public static S2C_ReqVar = 5
    public static C2S_ReqVar = 6
    //单步跳过
    public static S2C_NextRequest = 7
    //单步跳过反馈
    public static C2S_NextResponse = 8
    //没有单步跳过了 直接跳过
    public static S2C_NextResponseOver = 9
    //单步跳入
    public static S2C_StepInRequest = 10
    //单步跳入返回
    public static C2S_StepInResponse = 11

    //单步跳出
    public static S2C_StepOutRequest = 12
    //单步跳出返回
    public static C2S_StepOutResponse = 13

    //单步跳出返回
    public static C2S_LuaPrint = 14


    //执行lua字符串
    public static S2C_LoadLuaScript = 16
    //执行lua字符串
    public static C2S_LoadLuaScript = 18
    //设置socket的名字
    public static C2S_SetSocketName = 17
    
    public static C2S_DebugXpCall = 20

}

export class LuaProcess extends EventEmitter {
    private server: net.Server;
    private luaDebug: LuaDebug;
    public mainSocket: net.Socket;
    public breakPointSocket: net.Socket;
    public loadLuaCallBack: Function;
    private jsonStrs: Map<net.Socket, string>;

    public port: number;
    //调试子进程
    private debugprocess: childProcess.ChildProcess;
    private socketState_: SocketClientState;
    public delayMsgs: Array<any>;
    /**
     * 获得连接状态
     */
    public getSocketState(): SocketClientState {
        return this.socketState_
    }
    public setSocketState(state: SocketClientState) {
        this.socketState_ = state;
    }
    // private clientSocket: net.Socket;
    /**
     * 设置连接状态
     */
    set socketState(state: SocketClientState) {
        this.socketState_ = state;
    }
    public close() {
        this.server.close();
        this.server = null;
    }

    public runLuaScript(data, callBack: Function) {
        this.loadLuaCallBack = callBack;
        var socket = this.luaDebug.isHitBreak == true ? this.mainSocket : this.breakPointSocket;
        this.sendMsg(LuaDebuggerEvent.S2C_LoadLuaScript, data, socket)
    }
    
    public createServer() {
        this.jsonStrs = new Map<net.Socket, string>()
        var timeout = 20000;//超时
        var listenPort = this.port;//监听端口
        var luaProcess: LuaProcess = this
        var luaDebug: LuaDebug = this.luaDebug
        this.delayMsgs = new Array<any>()
        this.server = net.createServer(function (socket) {
            luaProcess.setSocketState(SocketClientState.connected)
            this.socketConnected = true
            socket.setEncoding('utf8');
          
            // 接收到数据
            socket.on('data', function (data: string) {
                if (data) {

                } else {
                    luaDebug.sendEvent(new OutputEvent("errordata-------:\n"))
                    return
                }
                // luaDebug.sendEvent(new OutputEvent("data:" + data + "\n"))

                var jsonStr:string =luaProcess.jsonStrs.get(socket)
                if(jsonStr) {
                   data = jsonStr + data
                }
                //消息分解
                var datas: string[] = data.split("__debugger_k0204__")
                var jsonDatas:Array<any> = new Array<any>();
                 for (var index = 0; index < datas.length; index++) {
                        var element = datas[index];
                    // luaDebug.sendEvent(new OutputEvent("element:" + element + "\n"))
                    if (element == "") {
                        // luaDebug.sendEvent(new OutputEvent("结束" + "\n"))
                        continue;
                    }
                    if (element == null) {
                        // luaDebug.sendEvent(new OutputEvent("element== null:" + "\n"))
                        continue;
                    }


                    try {
                        var jdata = JSON.parse(element)
                        jsonDatas.push(jdata)
                    } catch (error) {
                        jsonDatas = null
                        luaProcess.jsonStrs.set(socket,data)
                        return;
                    }
                 }
                 luaProcess.jsonStrs.delete(socket)
                for (var index = 0; index < jsonDatas.length; index++) {

                    var jdata = jsonDatas[index]
                    var event: number = jdata.event;


                    if (event == LuaDebuggerEvent.C2S_SetBreakPoints) {
                        var x = 1;
                        //断点设置成
                    } else if (event == LuaDebuggerEvent.C2S_HITBreakPoint) {

                        luaDebug.isHitBreak = true
                        luaProcess.emit("C2S_HITBreakPoint", jdata)
                    } else if (event == LuaDebuggerEvent.C2S_ReqVar) {

                        luaProcess.emit("C2S_ReqVar", jdata)
                    } else if (event == LuaDebuggerEvent.C2S_NextResponse) {
                        luaProcess.emit("C2S_NextResponse", jdata);
                    }
                    else if (event == LuaDebuggerEvent.S2C_NextResponseOver) {

                        luaProcess.emit("S2C_NextResponseOver", jdata);
                    } else if (event == LuaDebuggerEvent.C2S_StepInResponse) {
                        luaProcess.emit("C2S_StepInResponse", jdata);
                    } else if (event == LuaDebuggerEvent.C2S_StepOutResponse) {
                        luaProcess.emit("C2S_StepOutResponse", jdata);

                    } else if (event == LuaDebuggerEvent.C2S_LuaPrint) {
                        luaProcess.emit("C2S_LuaPrint", jdata);
                    } else if (event == LuaDebuggerEvent.C2S_LoadLuaScript) {
                        if (luaProcess.loadLuaCallBack) {
                            luaProcess.loadLuaCallBack(
                                {

                                    result: jdata.data.msg,
                                    variablesReference: 0

                                }
                            );
                            luaProcess.loadLuaCallBack = null


                        }
                    }
                    else if(event == LuaDebuggerEvent.C2S_DebugXpCall) 
                    {
                        luaDebug.isHitBreak = true
                        luaProcess.emit("C2S_HITBreakPoint", jdata)
                    }

                    else if (event == LuaDebuggerEvent.C2S_SetSocketName) {
                        if (jdata.data.name == "mainSocket") {
                            luaDebug.sendEvent(new OutputEvent("client connection!\n"))
                            luaProcess.mainSocket = socket;
                           
                            //发送断点信息
                            luaProcess.sendAllBreakPoint();
                            //发送运行程序的指令 发送run 信息时附带运行时信息 
                            luaDebug.isHitBreak = false
                            luaProcess.sendMsg(LuaDebuggerEvent.S2C_RUN,
                                {
                                    runTimeType: luaDebug.runtimeType,
                                    isProntToConsole:luaDebug.isProntToConsole
                                   

                                })
                        } else if (jdata.data.name == "breakPointSocket") {
                            luaProcess.breakPointSocket = socket;

                        }
                    }
                }

            });

            //数据错误事件
            socket.on('error', function (exception) {
                luaDebug.sendEvent(new OutputEvent('socket error:' + exception + "\n"))

                socket.end();
            });
            //客户端关闭事件
            socket.on('close', function (data) {
                luaDebug.sendEvent(new OutputEvent('close: ' +
                    socket.remoteAddress + ' ' + socket.remotePort + "\n"))


            });


        }).listen(this.port);

        //服务器监听事件
        this.server.on('listening', function () {

            luaDebug.sendEvent(new OutputEvent("调试消息端口:" + luaProcess.server.address().port + "\n"))
        });

        //服务器错误事件
        this.server.on("error", function (exception) {
            luaDebug.sendEvent(new OutputEvent("socket 调试服务器错误:" + exception + "\n"))

        });


    }

    public sendMsg(event: number, data?: any, socket?: net.Socket) {


        var sendMsg = {
            event: event,
            data: data
        }


        try {
            var msg = JSON.stringify(sendMsg)
            var currentSocket: net.Socket = socket;
            if (currentSocket == null) {
                currentSocket = this.mainSocket;

            }

            // this.luaDebug.sendEvent(new OutputEvent("server->send Event:" + msg + "\n"))
            currentSocket.write(msg + "\n");

        } catch (erro) {
            this.luaDebug.sendEvent(new OutputEvent("发送消息到客户端错误:" + erro + "\n"))
        }
    }


    public sendAllBreakPoint() {
        var infos = this.luaDebug.breakPointData.getAllClientBreakPointInfo()
        this.sendMsg(LuaDebuggerEvent.S2C_SetBreakPoints, infos, this.mainSocket)
    }



    public constructor(luaDebug: LuaDebug, mode: Mode, args: any) {
        super();

        this.port = args.port;
        this.luaDebug = luaDebug;
        this.createServer();
    }


}
