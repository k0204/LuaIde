import { DebugProtocol } from 'vscode-debugprotocol';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { LuaDebug } from './LuaDebug';
import {
	DebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent, Event,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';

export class BreakPointData {

	private currentText: string;
	private vindex: number;
	private _breakPoints = new Map<string, Array<number>>();
	private _breakpointId = 111000;
	private length: number;
	private line: number;
	private isAddLine: boolean;
	private lines: Array<number>;
	private lineContent: string = "";
	private luaDebug: LuaDebug;

	constructor(luaDebug: LuaDebug) {
		this.luaDebug = luaDebug
	}
	public getNextBid() {
		return ++this._breakpointId;
	}

	public getAllClientBreakPointInfo() {
		var data = []

		this._breakPoints.forEach((v, k) => {
				
			var path: string = k;
			//进行替换 将本地path 替换为远程
			var pathinfo = this.luaDebug.convertToClientPath(path,v)
			data.push(pathinfo)
		});
		return data;
	}
	public getClientBreakPointInfo(path): any {
		path =  path.replace(/\\/g, "/");
		if (this._breakPoints.has(path)) {

			var breakPoints = this._breakPoints.get(path);
			var pathinfo = this.luaDebug.convertToClientPath(path,breakPoints)
			
			return [pathinfo];
		}
		return null;
	}

	public verifiedBreakPoint(path: string, berakLines: Array<number>) {

		this.line = 1;
		this.currentText = readFileSync(path).toString()
		this.length = this.currentText.length;
		this.vindex = 0;
		this.lines = new Array<number>();
		while (true) {
			this.isAddLine = true
			var charCode = this.currentText.charCodeAt(this.vindex)
			var next = this.currentText.charCodeAt(this.vindex + 1);
			if (charCode == 45 && next == 45) {
				//获取评论
				this.scanComment();
				this.skipWhiteSpace();
			} else {

				this.lineContent += this.currentText.charAt(this.vindex)
				if (!this.consumeEOL()) {
					this.vindex++;
				}
			}

			if (this.vindex >= this.length) {
				this.addLine();
				break;
			}
		}
		var count = this.lines.length;

		var breakpoints = new Array<Breakpoint>();
		var luaBreakLine = new Array<number>();
		for (var index = 0; index < berakLines.length; index++) {
			this.addBreakPoint(berakLines[index], breakpoints, luaBreakLine)
		}

		this._breakPoints.set(path.replace(/\\/g, "/"), luaBreakLine)
		return breakpoints;
		// const bp:DebugProtocol.Breakpoint = new Breakpoint(true, this.convertDebuggerLineToClient(line));

	}
	private addBreakPoint(line: number, breakpoints: Array<Breakpoint>, luabreakLines: Array<number>) {
		for (var index = 0; index < this.lines.length; index++) {
			var fline = this.lines[index];
			if (fline >= line) {
				if (luabreakLines.indexOf(fline) == -1) {
					const bp: DebugProtocol.Breakpoint = new Breakpoint(true, fline);
					luabreakLines.push(fline);
					breakpoints.push(bp);
					bp.id = this.getNextBid()
					bp.verified = true

				}

				break;
			}
		}
	}
	private addLine() {
		this.lineContent = this.lineContent.trim();
		if (this.lineContent.length > 0) {
			this.lines.push(this.line)
			this.lineContent = "";
		}
	}

	/**
 * 获取注释
 */
	private scanComment(): void {
		//  this.tokenStart = this.vindex;
		this.isAddLine = false
		this.vindex += 2;
		//当前字符
		var character = this.currentText.charAt(this.vindex);
		//注释内容
		var content;
		// 是否为长注释  --[[  长注释 ]]
		var isLong = false;
		var commentStart = this.vindex;
		if ('[' == character) {
			content = this.readLongString();
			if (content == false) {
				content = character;
			}
			else {
				isLong = true;
			}
		}
		if (!isLong) {

			while (this.vindex < this.length) {
				if (this.isLineTerminator(this.currentText.charCodeAt(this.vindex))) break;
				this.vindex++;
			}

		}
	}

	/**
	 * 获取长字符串
	 *  * return 
	 *          为长字符串 content
	 *          不为长字符串  false
	 */
	private readLongString(): any {
		//多少个  等于符号
		var level: number = 0;
		//注释内容  
		var content: string = '';
		var terminator: boolean = false;
		var character: string = null;
		var stringStart: number = 0;
		this.vindex++; //将位置移到 需要判断的字符  上已阶段以及判断到了 [
		// 获取等于符号的多少

		while ('=' === this.currentText.charAt(this.vindex + level)) {
			level++;
		}
		// 如果是[ 那么继续 如果不为 [ 那么 直接返回
		if ('[' !== this.currentText.charAt(this.vindex + level)) {
			return false;
		}
		this.vindex += level + 1;
		if (this.isLineTerminator(this.currentText.charCodeAt(this.vindex))) {
			this.consumeEOL();
		}
		//注释开始的位置
		stringStart = this.vindex;
		// 读取注释内容
		while (this.vindex < this.length) {
			while (true) {
				if (this.isLineTerminator(this.currentText.charCodeAt(this.vindex))) {
					this.consumeEOL();
				} else {
					break;
				}
			}

			character = this.currentText.charAt(this.vindex++);

			if (']' == character) {

				terminator = true;
				for (var i = 0; i < level; i++) {
					if ('=' !== this.currentText.charAt(this.vindex + i)) {
						terminator = false;
					}
				}
				if (']' !== this.currentText.charAt(this.vindex + level)) {
					terminator = false;
				}
			}
			if (terminator) break;

		}
		if (terminator) {
			content += this.currentText.slice(stringStart, this.vindex - 1);
			this.vindex += level + 1;
			this.lineContent = "";
			return content;
		} return false;

	}


    /**
   * 判断是否换行
   *  */
	public isLineTerminator(charCode): boolean {
		return 10 === charCode || 13 === charCode;
	}
	/**
	* 跳过空格
	*/
	private skipWhiteSpace(): void {
		while (this.vindex < this.length) {
			var charCode = this.currentText.charCodeAt(this.vindex);
			//空格 解析
			if (this.isWhiteSpace(charCode)) {
				this.vindex++;
			}
			//解析换行 
			else if (!this.consumeEOL()) {
				break;
			}
		}
	}
	/**
	 * 解析换行
	 */
	private consumeEOL(): boolean {
		var charCode = this.currentText.charCodeAt(this.vindex);
		var peekCharCode = this.currentText.charCodeAt(this.vindex + 1);
		//判断是否换行
		if (this.isLineTerminator(charCode)) {
			if (10 === charCode && 13 === peekCharCode) this.vindex++;
			if (13 === charCode && 10 === peekCharCode) this.vindex++;
			if (this.isAddLine) {


				this.addLine();
			}
			this.line++;
			++this.vindex
			return true;
		}
		return false;
	}
    /**
  * 判断是否是空格
  *  */
	public isWhiteSpace(charCode): boolean {
		return 9 === charCode || 32 === charCode || 0xB === charCode || 0xC === charCode;
	}

}
