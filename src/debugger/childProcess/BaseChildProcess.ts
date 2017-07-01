import child_process = require('child_process');

var fs = require('fs');
var path = require('path');
var os = require('os');
import { LuaDebug } from '../LuaDebug';
// import vscode = require('vscode');
export class BaseChildProcess {


    public args: any;
    public childPid: number;
    private luaDebug: LuaDebug;
    public constructor(args: any, luaDebug: LuaDebug) {
        this.args = args;
        var os = process.platform;
        var runtimeType = args.runtimeType
        this.luaDebug = luaDebug;
    }

    public execLua(): child_process.ChildProcess {
        
        //判断平台
        //linux
        //darwin
        //win32
        var os = process.platform;
        var luaStartProc;
        var runtimeType: string = this.args.runtimeType;
  var localRoot: string = path.normalize(this.args.localRoot)
        var baseChildProcess: BaseChildProcess = this;
        var options = null;
        if (os == "linux") {

        } else if (os == "darwin") {
            if (runtimeType == "Cocos2" || runtimeType == "Cocos3") {

              
                var file = path.join(localRoot, this.args.mainFile)
                file = path.normalize(file)
                options = {
                    encoding: 'utf8',
                    shell: true
                };
                var pargs = [
                    "-workdir " + localRoot,
                    "-file " + file
                ]
                var exePath: string = path.normalize(this.args.exePath)
                exePath = exePath.replace(/ /g, "\\ ");
                luaStartProc = child_process.spawn(exePath, pargs, options)

            }
        } else if (os == "win32") {
            if(runtimeType == "LuaTest"){

                var fileName = process.mainModule.filename;
                var fileInfos = fileName.split("out")
                var debugPath =  path.join(fileInfos[0],"LuaDebug")
                debugPath = debugPath.replace(/\\/g, "/");
               localRoot = localRoot.replace(/\\/g, "/");
                var pathStr = "package.path = package.path .. ';" + debugPath + "/?.lua;" + localRoot + "/?.lua;'"
                pathStr += "print(package.path)"
                pathStr += "require('LuaDebug')('localhost',"+ this.args.port +")"
               
                pathStr += "require('"+ this.args.mainFile +"')"
                
                
                options = {
                    encoding: 'utf8',
                    shell: true
                };
               luaStartProc = child_process.exec('lua -e "'+pathStr + '"')
                // var exePath: string = path.normalize(this.args.exePath)
                // exePath = exePath.replace(/ /g, "\\ ");
                // luaStartProc = child_process.spawn(exePath, [], options)
               // if (runtimeType == "Lua51") {
            //     exePath = getLuaRuntimePath()
            //     exePath = exePath.replace(/\\/g, "/");

            //     var exe = path.join(exePath, "lua.exe");
            //     var cmd: string = exe + " DebugConfig.lua";
            //     options = {
            //         encoding: 'utf8',
            //         timeout: 0,
            //         maxBuffer: 200 * 1024,
            //         killSignal: 'SIGTERM',
            //         cwd: exePath,
            //         env: null
            //     };
            //     //生成 调试文件
                
            //     var localRoot: string = this.args.localRoot;

            //     var localRoot: string = localRoot.replace(/\\/g, "/");

            //     localRoot += "/?.lua"
            //     var pathStr = 'package.path = package.path .. ";' + localRoot + '";\n'
            //     // var cpathStr = 'package.cpath = package.cpath ..";' + path.join(exRootPath, "luadebug","socket", "?.dll")+'";\n'

            //     var mainFile: string = this.args.mainFile

            //     var mindex = mainFile.lastIndexOf("\\");
            //     if (mindex > -1) {
            //         var mdir: string = mainFile.substring(0, mindex)
            //         mainFile = mainFile.substring(mindex + 1)
            //         mainFile = mainFile.split(".")[0]
            //         if (mdir != this.args.localRoot) {

            //             mdir = mdir.replace(/\\/g, "/");
            //             localRoot += "/?.lua"
            //             pathStr += 'package.path = package.path .. ";' + mdir + '";'
            //         }
            //     }
            //     pathStr += 'require("LuaDebug")("' + this.args.host + '", ' + this.args.port + ')\n';
            //     pathStr += 'require("' + mainFile + '")';

            //     //写入文件
            //     try {
            //         var fileName = path.join(exePath, "DebugConfig.lua")
            //         var expath = getExtensionPath();
            //         fs.writeFileSync(fileName, pathStr);


            //     } catch (err) {
            //         return err
            //     }
            //     luaStartProc = child_process.spawn("lua.exe", ["DebugConfig.lua"], options)
        
            } else if (runtimeType == "Cocos2" || runtimeType == "Cocos3") {
                var localRoot: string = path.normalize(this.args.localRoot)
                var file = path.join(localRoot, this.args.mainFile)
                file = path.normalize(file)
                options = {
                    encoding: 'utf8',
                    shell: true
                };
                var pargs = [
                    "-workdir " + localRoot,
                    "-file " + file
                ]
                var exePath: string = path.normalize(this.args.exePath)
                exePath = exePath.replace(/ /g, "\\ ");
                luaStartProc = child_process.spawn(exePath, pargs, options)
            }


            child_process.exec(
                "wmic process where (parentprocessid=" + luaStartProc.pid + ") get processid"
                , function (err, stdout, stderr) {
                    if (stdout != "") {
                        var info = stdout.split('\n');
                        if (info.length > 1) {
                            var pid = info[1].trim()
                            baseChildProcess.childPid = Number(pid)
                            //process.kill(Number(pid))
                        }
                    }
                })



        }
        return luaStartProc
    }
    public execCocosQuity() {

    }
}