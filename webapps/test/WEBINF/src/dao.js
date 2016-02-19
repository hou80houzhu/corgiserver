/* 
 * @packet dao;
 */
Module({
    name: "mysqldao",
    extend: "dao",
    daoName: "mysql2",
    test: function () {
        this.getConnect(function (con) {
            con.query('SELECT * FROM user', function (err, rows) {
                con.release();
            });
        });
    },
    query: function (sql) {
        var ps = packet.promise();
        this.getConnect(function (con) {
            con.query(sql, function (err, rows) {
                if (err) {
                    ps.reject(err);
                } else {
                    ps.resolve(rows);
                }
                con.release();
            });
        });
        return ps;
    }
});

