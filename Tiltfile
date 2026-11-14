load('ext://uibutton', 'cmd_button', 'choice_input', 'location', 'text_input', 'bool_input')
load('ext://dotenv', 'dotenv')

dotenv()

local_resource(
    name='Web',
    labels=["Apps"],
    serve_cmd="bun --cwd apps/web dev",
    resource_deps=['D1 Migrate (local)'],
    links=[ link("http://localhost:3000/", "Web") ],
)
cmd_button(
    name="btn-web-kill",
    resource="Web",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :3000 -t | xargs kill"],
)


local_resource(
    name='Workflows',
    labels=["Apps"],
    serve_cmd="bun run --cwd apps/workflows dev",
    resource_deps=['D1 Migrate (local)'],
    links=[ link("http://localhost:8787/", "Workflows Worker") ],
)
cmd_button(
    name="btn-workflows-kill",
    resource="Workflows",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :8787 -t | xargs kill"],
)

local_resource(
    name='Drizzle Studio',
    labels=["Development"],
    serve_cmd="bun run --cwd packages/db db:studio:local",
    links=[link("https://local.drizzle.studio", "Drizzle Studio") ],
)

local_resource(
    name='Email Preview',
    labels=["Development"],
    serve_cmd="bun run --cwd packages/email dev",
    links=[ link("http://localhost:3002/", "Email Preview") ],
)

local_resource(
    name='D1 Migrate (local)',
    labels=["Development"],
    cmd="bun run db:migrate:local && bun run --cwd apps/web db:seed:local",
)
cmd_button(
    name="btn-d1-delete-data",
    resource="D1 Migrate (local)",
    icon_name="delete",
    text="Delete Data",
    argv=["sh", "-c", "rm -rf .wrangler/state/v3/d1 && echo 'Local D1 deleted. Re-run D1 Migrate (local) to migrate and seed.'"],
)
