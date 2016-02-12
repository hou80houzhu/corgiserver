/* 
 * @packet table.table;
 */
Module({
    name: "user",
    extend: "table",
    tableName: "user",
    cols: ["id", "username", "password", "role", "icon"]
});

