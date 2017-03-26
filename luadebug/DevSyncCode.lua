--开发模式同步代码工具
local DevSyncCode = {}
function DevSyncCode:ctor()
    --所以需要更新的代码实例
    self.classInstances = {}

end
function DevSyncCode:addInstances(ins)
    table.insert( self.classInstances,ins)
end
--读取修改后的lua 文件并修改内存
function DevSyncCode:updateLuaCode(packageName)
	if (packageName == nil or packageName == "") then return end
	
	local oldInfo = package.loaded[packageName]
	if(oldInfo == nil) then
		return
	end

	local package1 = package
	
	package.loaded[packageName] = nil
	--先存储所以得全局变量
	local temp_G = {}
	for k,v in ipairs(package.loaded._G) do
		temp_G[k] = v
	end
	local newInfo = nil
	--重新require
	local requireUpdateLua=function ( ... )
		newInfo = require(packageName)
	end
	
	tryCatch=function(fun)
	  local ret,errMessage=pcall(fun);
		if(ret == false) then
			package.loaded[packageName] = oldInfo
			local _g = package.loaded._G
			for k,v in ipairs(temp_G) do
				if(k ~= "CSBTableCache") then
						_g[k] = v
				end
				
			end
			print("存在错误不处理:"..packageName)
		elseif(ret) then
			 
		
			--重新require 后把所以得全局变量都还原
			--这么做的原因是因为  如果不做这样的处理 会导致 已经修改过的全局变量 会在
			--require 时 更新成初始的值  所以本工具不支持修改代码中的值直接生效  
			--所以得更改都应该在代码中去进行 才能及时生效
			local _g = package.loaded._G
			for k,v in ipairs(temp_G) do
				_g[k] = v
			end
			
			
			--先把原有的信息在package 中删除  不然没法重新require
			local tempInfo = {}
			if(type(oldInfo) == "table") then
				for k,v in pairs(oldInfo) do
					if(type(v) ~= "function") then
						tempInfo[k] = v
					else
						self:replaceEventManagerHandler(oldInfo,v,newInfo[k])
					end
				end
			end
			local infoType = type(newInfo)
			if (infoType == "table") then
				
				--如果为table  那么需要替换以前的
				for k,v in pairs(newInfo) do
					
					local typestr =  type(v)
					if(typestr == "function") then
						oldInfo[k] = v
					end
				end
				local currentInfo = oldInfo
				if(newInfo.__ctype) then
					package.loaded[packageName] = oldInfo
				else
					currentInfo =newInfo
				end
				--将现有的值进行赋值达到只替换代码逻辑而不修改值得效果
				for k,v in pairs(tempInfo) do
					if(type(v) ~= "function") then
						currentInfo[k] = v
					end
				end
				--下面这些是修改创建出来的userdata 数据
				if (newInfo.__ctype == 1) then
					local delTable = {}
					
					for k,v in ipairs(__dscInstances__) do
						
						if (not tolua.isnull(v)) then
							local itype = type(v)
							if (itype == "userdata") then
								if (iskindof(v,newInfo.__cname)) then
									self:replaceInfo(v,newInfo)
								end
							end
						else
							table.insert(delTable,v)
						end
					end
					self:delTables(__dscInstances__,delTable)
					
				end
			
			end
			print("处理完毕:"..packageName)
		end
	end
	
	tryCatch(requireUpdateLua);
	
	
	
	
end


return DevSyncCode