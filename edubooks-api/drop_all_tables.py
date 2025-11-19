#!/usr/bin/env python
import os
import sys
import django
from django.conf import settings
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edubooks.settings')
django.setup()

def drop_all():
    engine = settings.DATABASES['default']['ENGINE']
    try:
        with connection.cursor() as cursor:
            if 'postgresql' in engine:
                cursor.execute("DO $$ DECLARE r RECORD; BEGIN FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE'; END LOOP; END $$;")
            elif 'mysql' in engine:
                cursor.execute('SET FOREIGN_KEY_CHECKS=0;')
                for t in connection.introspection.table_names():
                    cursor.execute(f'DROP TABLE IF EXISTS `{t}`;')
                cursor.execute('SET FOREIGN_KEY_CHECKS=1;')
            elif 'sqlite' in engine:
                for t in connection.introspection.table_names():
                    cursor.execute(f'DROP TABLE IF EXISTS "{t}";')
            else:
                for t in connection.introspection.table_names():
                    cursor.execute(f'DROP TABLE IF EXISTS {t};')
        print('OK')
        sys.exit(0)
    except Exception as e:
        print(f'ERROR: {e}')
        sys.exit(1)

if __name__ == '__main__':
    drop_all()