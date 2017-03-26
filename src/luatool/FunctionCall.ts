import { LuaInfo, TokenInfo, LuaInfoTypeValue, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
export class FunctionCall {

    private lp: LuaParse;

    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    /**
     * @isSemicolons 是否检查 ;
     * @isForFunction 是否为 for 循环  ipairs pairs
     * @isLackM 是否缺少括号
     */
    public check(luaInfo: LuaInfo, isSemicolons: boolean, isForFunction: boolean,isLackM:boolean = false): void {
        // console.log("functionCallStart")
        luaInfo.type = LuaInfoType.FunctionCall1;
        
        // luaInfo.setEndToken(this.lp.getCurrentToken(null))
        //判断是否为没有参数的方法
        var token: TokenInfo = this.lp.getNextToken("方法调用代码未完成")
        if (this.lp.isError) return

        if (isForFunction == false && this.lp.consume(')', token, TokenTypes.Punctuator)) {
            luaInfo.getTopLuaInfo().setEndToken(token)
            luaInfo.getTopLuaInfo().isNextCheck = false
            this.checkNext(luaInfo);
            if (isSemicolons) {
                this.lp.checkSemicolons();
            }
            luaInfo.getTopLuaInfo().setEndToken(token)
            
            return

        }
        var parameterIndex:number = 0;
        while (true) {
            CLog();
            // console.log("functionCall")
            this.checkParameter(isForFunction, luaInfo,parameterIndex)
            parameterIndex++;
            if (this.lp.isError) return

            var token: TokenInfo = this.lp.getNextToken("方法调用代码未完成")
            if (isForFunction) {
                if (this.lp.consume(')', token, TokenTypes.Punctuator)) {
                    if(!isForFunction){
                        luaInfo.getTopLuaInfo().setEndToken(this.lp.getUpToken())
                    }
                    return
                } else {
                    this.lp.setError(token, luaInfo.name + 　"错误  应该为 )")
                    return
                }

            }
            if (this.lp.consume(',', token, TokenTypes.Punctuator)) {

                this.lp.tokenIndex++;
                continue
            } else if (this.lp.consume(')', token, TokenTypes.Punctuator)) {
                if(!isForFunction){
                    luaInfo.getTopLuaInfo().setEndToken(token)
                }
                luaInfo.getTopLuaInfo().isNextCheck = false
                this.checkNext(luaInfo)
                if (isSemicolons) {
                    this.lp.checkSemicolons();
                }
                
                return 
            }
        }
    }


    public checkNext(luaInfo: LuaInfo) {
        var nextToken: TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex + 1, null);
        if (nextToken) {
            if (this.lp.consume('.', nextToken, TokenTypes.Punctuator)) {
                this.lp.tokenIndex++;
                var newLuaInfo: LuaInfo = new LuaInfo(luaInfo.startToken)
                 luaInfo.setNextLuaInfo(newLuaInfo)
                nextToken = this.lp.getNextToken("代码未完成")
                if (this.lp.isError) return;
                if (nextToken.type != TokenTypes.Identifier) {
                    this.lp.setError(nextToken, "意外的字符")
                    return;
                } else {

                }

                this.lp.luaChuckInfo.check(newLuaInfo, true)
                var endToken:TokenInfo = this.lp.getCurrentToken(null)


                if (this.lp.isError) return
                var token:TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex+1,null)
                if(token == null)return
                if (this.lp.isError) return
                if(this.lp.consume('=',token,TokenTypes.Punctuator))
                {
                   
                    this.lp.tokenIndex+=2;
                    this.lp.luaSetValue.check(true,true,[newLuaInfo])
                    newLuaInfo.startToken = newLuaInfo.getTopLuaInfo().startToken
                    newLuaInfo.setEndToken(endToken)
                }else
                {
                    newLuaInfo.startToken = newLuaInfo.getTopLuaInfo().startToken
                    newLuaInfo.setEndToken(endToken)
                }
            } else if (this.lp.consume('[', nextToken, TokenTypes.Punctuator)) {
                this.lp.tokenIndex += 2;
                this.lp.luaValidateBracket_G.check(luaInfo,true)
            }
            else if (this.lp.consume('(', nextToken, TokenTypes.Punctuator)) {

                this.lp.tokenIndex++;
                this.lp.functionCall.check(luaInfo, true, false);
            }
            else if (this.lp.consume(':', nextToken, TokenTypes.Punctuator)) {
                this.lp.tokenIndex += 2;
                 var newLuaInfo: LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
                 luaInfo.setNextLuaInfo(newLuaInfo);
                this.lp.luaChuckInfo.checkModuleFunctionCall(newLuaInfo, true)

            } else {
                //this.setLuaFunctionCall(luaInfo)
            }
            // else if (this.lp.consume('..', nextToken, TokenTypes.Punctuator)) {
            //      this.lp.tokenIndex+= 2;
            //     this.lp.luaSetValue.check(true,true)
            // }
        } else {
            //  this.setLuaFunctionCall(luaInfo)
        }

    }



    public checkParameter(isForFunction: boolean, parent: LuaInfo,parameterIndex:number): boolean {

        var luaInfo: LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
        //检查是否为一元
        var luainfos: Array<LuaInfo> = new Array<LuaInfo>()
        while (true) {
            var nextLuaInfo: LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
          
            luainfos.push(nextLuaInfo)
            if (!isForFunction) {
                this.lp.luaCheckUnary.check(nextLuaInfo);
            }

            this.lp.luaChuckInfo.check(nextLuaInfo, false)
            if(nextLuaInfo.type != LuaInfoType.Function)
            {
                nextLuaInfo.setEndToken(this.lp.getCurrentToken(null))
            }else
            {
                //
                // nextLuaInfo
                
                LuaParse.lp.luaInfoManager.addSymbol(nextLuaInfo,this.lp.getUpToken(),
                
                this.lp.getCurrentToken(null),"TempFun_"+nextLuaInfo.startToken.line +"_"+ nextLuaInfo.startToken.lineStart)
            }



            if (this.lp.isError) return null
            if (isForFunction) {
                if (luaInfo.type != LuaInfoType.FunctionCall1 &&
                    luaInfo.type != LuaInfoType.Field &&
                    luaInfo.type != LuaInfoType.Table) {
                    this.lp.setError(this.lp.getCurrentToken(null), parent.name + "  错误的字符")
                    return false
                } else {
                    return true
                }
            }
            var nextToken: TokenInfo = this.lp.getNextToken(null);
            if (nextToken == null) {
                this.lp.luaCheckLuaInfos.check(luainfos, luaInfo)
                return
            }
            //验证是否为括号 ]
            //判断二元

            if (this.lp.luaValidateOperator.check(nextToken)) {
                this.lp.tokenIndex++;
                nextLuaInfo.operatorToken = nextToken
                continue
            }
            else {
                this.lp.luaCheckLuaInfos.check(luainfos, luaInfo)
                this.lp.tokenIndex--;
                return
            }
        }

    }



}








        





