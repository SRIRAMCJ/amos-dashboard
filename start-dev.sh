#!/bin/bash
unset DATABASE_URL
unset DIRECT_URL
export DATABASE_URL="postgresql://neondb_owner:npg_ExbWfuIykY96@ep-muddy-shadow-aonbdse1-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
export DIRECT_URL="postgresql://neondb_owner:npg_ExbWfuIykY96@ep-muddy-shadow-aonbdse1.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
cd /home/z/my-project
exec npx next dev -p 3000