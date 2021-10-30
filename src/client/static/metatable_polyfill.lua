local orig_setmetatable = setmetatable

local metatable_record = {};

setmetatable(metatable_record, { __mode = 'k' })

function setmetatable(table, metatable)
  metatable_record[table] = metatable
  return orig_setmetatable(table, metatable)
end

function getmetatable(table)
  return metatable_record[table]
end
