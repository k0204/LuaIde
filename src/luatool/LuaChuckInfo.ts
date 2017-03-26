import {LuaInfo, TokenInfo, TokenTypes, LuaComment,
    LuaRange, LuaErrorEnum, LuaError, LuaInfoType} from './TokenInfo';
import {LuaParse} from './LuaParse'
/**验证 一个代码段 */
export class LuaChuckInfo {
    private lp: LuaParse;
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }


    public check(luaInfo: LuaInfo, isSemicolons: boolean) {
        var token: TokenInfo = this.lp.getCurrentToken("代码未完成")
        if (this.lp.isError) return
        luaInfo.setComments(token.comments)
        if (this.lp.consume('(', token, TokenTypes.Punctuator)) {
            this.lp.tokenIndex++;
            this.lp.luaValidateBracket_M.check(luaInfo)
            if (this.lp.isError) return
        }
        else if (this.lp.consume("function", token, TokenTypes.Keyword)) {
            luaInfo.isAnonymousFunction = true
            this.lp.luaFunctionParse.check(luaInfo, true, null)
            this.lp.tokenIndex--;
            return
        }
        else if (this.lp.consume('{', token, TokenTypes.Punctuator)) {
            var endToken: TokenInfo = this.lp.getUpToken();
            this.lp.luaTableParse.check(luaInfo);
            luaInfo.setEndToken(endToken);
            return
        }
        else if (token.type == TokenTypes.Keyword) {
            this.lp.setError(token, "关键字不能作为 变量名")
            return false
        }
        else {
            //设置luainfo 的值
            this.lp.luaValidateConstValue.check(token, luaInfo);
            if (this.lp.isError) return
            luaInfo.name = token.value
        }

        var currentToken:TokenInfo = this.lp.getCurrentToken(null);

        //检查还有没有
        var nextToken: TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex + 1, null)
        if (nextToken == null) return
        
        if (currentToken.type == TokenTypes.Identifier) {
            if (
                nextToken.type == TokenTypes.BooleanLiteral ||
                nextToken.type == TokenTypes.NilLiteral ||
                nextToken.type == TokenTypes.NumericLiteral ||
                nextToken.type == TokenTypes.StringLiteral ||
                nextToken.type == TokenTypes.VarargLiteral
            ) {
                this.lp.tokenIndex++;
                luaInfo.getTopLuaInfo().isNextCheck = false
                return
            } else if (this.lp.consume('{', nextToken, TokenTypes.Punctuator)) {
                var tableLuaInfo: LuaInfo = new LuaInfo(nextToken)
                this.lp.tokenIndex++;
                this.lp.luaTableParse.check(tableLuaInfo)
                luaInfo.getTopLuaInfo().isNextCheck = false
                return
            }

        }

        if (this.lp.consume(',', nextToken, TokenTypes.Punctuator)) {
            return
        }
        if (token.type != TokenTypes.Identifier &&
            token.type != TokenTypes.VarargLiteral) {
            if (this.lp.consume('.', nextToken, TokenTypes.Punctuator) ||
                this.lp.consume('[', nextToken, TokenTypes.Punctuator) ||
                this.lp.consume(':', nextToken, TokenTypes.Punctuator) ||
                this.lp.consume('(', nextToken, TokenTypes.Punctuator)) {
                this.lp.setError(nextToken, "意外的字符")
                return
            }
        }

        if (this.lp.consume('(', nextToken, TokenTypes.Punctuator)) {

            if (luaInfo.isLocal) {
                this.lp.setError(nextToken, "意外的字符")
                return
            }
            if (luaInfo.ismultipleVariables) {
                this.lp.setError(nextToken, "意外的字符")
                return
            }
            this.lp.tokenIndex++;
            this.lp.functionCall.check(luaInfo, isSemicolons, false)

        }
        else if (this.lp.consume('.', nextToken, TokenTypes.Punctuator) ||
            this.lp.consume('[', nextToken, TokenTypes.Punctuator) ||
            this.lp.consume(':', nextToken, TokenTypes.Punctuator)) {
            this.lp.tokenIndex += 2;
            if (luaInfo.isLocal) {
                this.lp.setError(token, "局部变量声明 无法包含 '" + token.value + "'")
                return null;
            } else {
                if (this.lp.consume('.', nextToken, TokenTypes.Punctuator)) {
                    var newLuaInfo: LuaInfo = new LuaInfo(this.lp.getTokenByIndex(this.lp.tokenIndex + 2, null));

                    //  this.lp.luaInfoManager.addLuaInfo(luaInfo, this.lp.getTokenByIndex(this.lp.tokenIndex + 1, null))

                    luaInfo.setNextLuaInfo(newLuaInfo)
                    nextToken = this.lp.getCurrentToken("代码未完成")
                    if (this.lp.isError) return;
                    if (nextToken.type != TokenTypes.Identifier) {
                        if (nextToken.type == TokenTypes.Keyword) {
                            this.lp.setError(nextToken, "关键字不能作为 变量名")
                        } else {
                            this.lp.setError(nextToken, "意外的字符")
                        }

                        return;

                    }

                    this.check(newLuaInfo, isSemicolons)
                    if (this.lp.isError) return

                } else if (this.lp.consume('[', nextToken, TokenTypes.Punctuator)) {
                    this.lp.luaValidateBracket_G.check(luaInfo, true)
                } else if (this.lp.consume(':', nextToken, TokenTypes.Punctuator)) {
                    this.checkModuleFunctionCall(luaInfo, isSemicolons)
                }

            }
        }
    }
    /**
     * 检查模块方法调用
     */
    public checkModuleFunctionCall(luaInfo: LuaInfo, isSemicolons: boolean) {
        var token: TokenInfo = this.lp.getCurrentToken("module 方法调用错误");
        if (this.lp.isError) return
        if (token.type != TokenTypes.Identifier) {
            this.lp.setError(token, "module 方法调用错误 出现意外字符")
            return
        }
        var newLuaInfo: LuaInfo = new LuaInfo(token)
        if (luaInfo != null) {
            luaInfo.setNextLuaInfo(newLuaInfo)
        }
        else {

        }
        var nextToken:TokenInfo = this.lp.getNextToken("module 方法调用错误");
        if (this.lp.isError) return
        if (!this.lp.consume('(', nextToken, TokenTypes.Punctuator)) {
            
           
            if (
                nextToken.type == TokenTypes.BooleanLiteral ||
                nextToken.type == TokenTypes.NilLiteral ||
                nextToken.type == TokenTypes.NumericLiteral ||
                nextToken.type == TokenTypes.StringLiteral ||
                nextToken.type == TokenTypes.VarargLiteral
            ) {
                
                luaInfo.getTopLuaInfo().isNextCheck = false
                return
            } else if (this.lp.consume('{', nextToken, TokenTypes.Punctuator)) {
                var tableLuaInfo: LuaInfo = new LuaInfo(nextToken)
                
                this.lp.luaTableParse.check(tableLuaInfo)
                luaInfo.getTopLuaInfo().isNextCheck = false
                 
                return
            }else
            {
                this.lp.setError(token, "module 方法调用错误")
            }
            return
        }
        this.lp.functionCall.check(newLuaInfo, isSemicolons, false)
        if (this.lp.isError) return

    }

}