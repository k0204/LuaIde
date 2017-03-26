import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
import {CLog} from './Utils'
import {ExtensionManager} from "../luatool/ex/ExtensionManager"
export class LuaFunctionParse {
    private lp: LuaParse;
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }






    public check(luaInfo: LuaInfo, isSemicolons: boolean, checkBreak: Function): boolean {
        var t: TokenInfo = this.lp.getCurrentToken(null)
        luaInfo.type = LuaInfoType.Function
        this.lp.currentfunctionCount++;

        var funName = t.value;
        var nindex: number = t.index;
        while (true) {
            nindex--;
            var upToken: TokenInfo = this.lp.getTokenByIndex(nindex, null);

            if (upToken == null) {
                break;
            }
            nindex--;
            if (

                this.lp.consume(':', upToken, TokenTypes.Punctuator) ||
                this.lp.consume('.', upToken, TokenTypes.Punctuator)) {
                var mtokenInfo: TokenInfo = this.lp.getTokenByIndex(nindex, null);
                funName = mtokenInfo.value + upToken.value + funName;
            } else {
                break;
            }
        }
        if(luaInfo.isAnonymousFunction)
        {
            
            funName = "TempFun_"+luaInfo.startToken.line +"_"+ luaInfo.startToken.lineStart
        }
        this.lp.currentFunctionNames.push(funName);

        //console.log("开始解析funcation")
        if (this.setFunctionParam(luaInfo) == false) return false

        this.lp.tokenIndex++;
        //进行方法内的解析
        var isEnd = this.lp.setLuaInfo(luaInfo, function (luaParse: LuaParse) {

            var token: TokenInfo = luaParse.getTokenByIndex(luaParse.tokenIndex, null)
            if (token == null) {
                luaParse.setError(luaParse.getLastToken(), "function 未结束", luaInfo.startToken)
                //"start  line:"+luaInfo.startToken.line + "    function 未结束"
            }
            if (luaParse.isError) {
                return false
            }
            if (luaParse.consume('end', token, TokenTypes.Keyword)) {
                if (isSemicolons) {
                    luaParse.checkSemicolons()
                }
                luaParse.tokenIndex++;

                return true
            }
            return false
        }, checkBreak)
        if (isEnd) {
            this.lp.functionEnd();
            this.lp.currentfunctionCount--;
            this.lp.currentFunctionNames.pop();
            return true
        }
        else {
            if (this.lp.isError) return;
            this.lp.setError(this.lp.getCurrentToken(null), "function 未结束" + luaInfo.name)
            return false
        }
        // while (true) {
        //     if (this.lp.tokenIndex < this.lp.tokensLength) {
        //         //检查是否有return 
        //         if(this.lp.luaCheckReturn.check(luaInfo))
        //         {
        //             return true
        //         }else
        //         {
        //             if(this.lp.isError)return false
        //         }
        //         if (this.lp.setLuaInfo(luaInfo)) {

        //             var nextToken = this.lp.getNextToken("function 未完成");
        //             if(nextToken == null) return false;
        //             if (this.lp.consume('end', nextToken, TokenTypes.Keyword)) return true
        //                 continue;

        //         } else {
        //             //检查是否未 字符
        //             if (this.lp.isError) {
        //                 return false
        //             } else {
        //                 this.lp.setError(this.lp.getCurrentToken( null),"未知的方法错误,注意处理检查逻辑 ");
        //                 // if (this.lp.consume('end', this.lp.getCurrentToken( null), TokenTypes.Keyword)) return true
        //                 return false;
        //             }

        //         }
        //     } else {


        //         this.lp.setError(this.lp.getTokenByIndex(this.lp.tokenIndex - 1, null), "方法未完成")
        //         return false
        //     }
        // }
    }

    /**
     * 解析方法参数
     */
    public setFunctionParam(luaInfo: LuaInfo) {
        // console.log("解析 方法参数 中...")
        //判断是否为 '('
        var bracketToken = this.lp.getNextToken("方法未完成")
        if (bracketToken === null) return false
        if (!this.lp.consume('(', bracketToken, TokenTypes.Punctuator)) {
            this.lp.setError(bracketToken, "意外的字符")
            return false
        }

        var bracketToken = this.lp.getNextToken("方法未完成")
        if (bracketToken === null) return false
        //判断是不是没有参数 
        if (this.lp.consume(')', bracketToken, TokenTypes.Punctuator)) {

            return true;
        }
        this.lp.tokenIndex--;
        var bracketCount: number = 0
        //方法参数只接受 TokenTypes.Identifier TokenTypes.VarargLiteral
        var isFist = true;
        while (true) {
            CLog();
            if (!isFist) {
                //检查逗号
                var commaToken = this.lp.getTokenByIndex(this.lp.tokenIndex + 1, "方法未完成");// this.getNextToken("方法未完成")
                if (commaToken == null) return false;
                if (!this.lp.consume(',', commaToken, TokenTypes.Punctuator)) {
                    this.lp.setError(commaToken, "应该为 ','")
                    return false
                } else {
                    this.lp.tokenIndex++;
                }
            }
            var paramToken = this.lp.getNextToken("参数 定义 未完成");
            if (paramToken == null) return false;
            if (paramToken.type == TokenTypes.Identifier || paramToken.type == TokenTypes.VarargLiteral) {
                isFist = false;
                // if(paramToken.type == TokenTypes.Identifier)
                // {
                //     var pluaInfo:LuaInfo = new LuaInfo(paramToken);
                //     pluaInfo.setEndToken(paramToken)
                // }
                if(ExtensionManager.em.luaIdeConfigManager.luaFunArgCheck)
                {
                    var index = luaInfo.addParam(paramToken.value)
                    if (index > -1) {
                        this.lp.setError(paramToken, "方法参数:'"+ paramToken.value + "'在第" + index + " 个参数已经存在")
                        return false;
                    }
                }
                
                //判断有没有结束
                if (this.lp.consume(')', this.lp.getTokenByIndex(this.lp.tokenIndex + 1, "方法未完成"), TokenTypes.Punctuator)) {
                    this.lp.tokenIndex++;
                    return true;
                }
            }
            else {
                this.lp.setError(paramToken, "意外的字符")
                return false
            }

        }

    }





}