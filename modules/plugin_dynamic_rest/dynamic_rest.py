class DynamicRest(object):
    def __init__(self, db):
        self.db = db
        self.actions = {}
    
    def registerTable(self, table, actions, init=False):
        for action in actions:
            if action not in self.actions:
                self.actions[action] = {'GET': GET, 'POST': POST, 'PUT': PUT, 'DELETE': DELETE}[action](self.db)
            self.actions[action].registerTable(table, init)
    
    def getActions(self):
        return self.actions
    
class GET(object):
    def __init__(self, db):
        self.db = db
        self.patterns = []
        self.templates = ['/{table}[{table}]',
            '/{table}/{{{table}.id}}']
        self.table_fields = {}
        self.init = {}
    
    def __call__(self, *args, **vars):
        if len(args) == 0:
            return {'content': self.table_fields.keys()}
        parser = self.db.parse_as_rest(self.patterns, args, vars)
        if parser.status != 200:
            raise HTTP(parser.status, parser.error)
        fields = [{'name': str(field).split('.')[-1],
                   'readable': field.readable,
                   'writable': field.writable,
                   'type': field.type} for field in self.table_fields[args[0]]]
        if len(args) == 1:
            collection = [{'id': row.id, '_init': None} for row in parser.response] if self.init[args[0]] else\
                [{field['name']: row[field['name']] for field in fields} for row in parser.response]
            return {'collection': collection,
                    'fields': fields}
        return {'element': parser.response[0]}
    
    def registerTable(self, table, init=False):
        fields = [table[field] for field in table.fields if table[field].readable or table[field].writable]
        template_pattern_map = {'table': table}
        for template in self.templates:
            self.patterns.append(template.format(**template_pattern_map))
        self.table_fields[str(table)] = fields
        self.init[str(table)] = init

class POST(object):
    def __init__(self, db):
        self.db = db
        self.table_fields = {}
    
    def __call__(self, *args, **vars):
        if args[0] not in self.table_fields:
            raise HTTP(403, 'Access forbidden')
        id = self.db[args[0]].insert(**vars)
        return {'id': id, 'success': True}
    
    def registerTable(self, table, init=False):
        fields = [table[field] for field in table.fields if table[field].readable or table[field].writable]
        self.table_fields[str(table)] = fields

class PUT(object):
    def __init__(self, db):
        self.db = db
        self.table_fields = {}
    
    def __call__(self, *args, **vars):
        if args[0] not in self.table_fields or args[0] in self.table_fields and not args[2] in self.table_fields[args[0]]:
            raise HTTP(403, 'Access forbidden')
        self.db[args[0]][args[1]] = {args[2]: vars['value']}
        return {'success': True}
    
    def registerTable(self, table, init=False):
        fields = [table[field] for field in table.fields if table[field].readable or table[field].writable]
        self.table_fields[str(table)] = fields

class DELETE(object):
    def __init__(self, db):
        self.db = db
        self.table_fields = {}
    
    def __call__(self, *args, **vars):
        if args[0] not in self.table_fields:
            raise HTTP(403, 'Access forbidden')
        del self.db[args[0]][args[1]]
        return {'success': True}
    
    def registerTable(self, table, init=False):
        fields = [table[field] for field in table.fields if table[field].readable or table[field].writable]
        self.table_fields[str(table)] = fields
