load('ext://uibutton', 'cmd_button', 'choice_input', 'location', 'text_input', 'bool_input')
load('ext://dotenv', 'dotenv')

dotenv()

local_resource(
    name='Web',
    labels=["Apps"],
    serve_cmd="bun --cwd apps/web dev",
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
    name='Trigger',
    labels=["Apps"],
    serve_cmd="bun run --cwd apps/trigger dev",
    links=[ link("https://cloud.trigger.dev/orgs/tailz-5e0b/projects/tailz-uBK2/env/dev/runs", "Trigger") ],
)

local_resource(
    name='Drizzle Studio',
    labels=["Development"],
    serve_cmd="bun run --cwd packages/db db:studio",
    links=[link("https://local.drizzle.studio", "Drizzle Studio") ],
)

local_resource(
    name='Storybook',
    labels=["Development"],
    serve_cmd="bun run --cwd apps/web storybook",
    links=[ link("http://localhost:6006/", "Storybook") ],
)

cmd_button(
    name="btn-storybook-kill",
    resource="Storybook",
    icon_name="terminal",
    text="Kill Port",
    argv=["sh", "-c", "lsof -i :6006 -t | xargs kill"],
)

local_resource(
    name='🐘 PostgreSQL',
    labels=["Development"],
    serve_cmd="bash scripts/start-postgres.sh",
)
cmd_button(
    name="btn-postgres-delete-data",
    resource="🐘 PostgreSQL",
    icon_name="delete",
    text="Delete Data",
    argv=["sh", "-c", "rm -rf .postgres-data && echo 'PostgreSQL data deleted. Restart the resource to reinitialize.'"],
)