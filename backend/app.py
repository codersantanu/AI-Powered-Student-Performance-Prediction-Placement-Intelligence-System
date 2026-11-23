import click
from dotenv import load_dotenv
from . import create_app
from .extensions import db
from .models import User

load_dotenv()
app = create_app()


@app.cli.command('create-admin')
@click.option('--name', prompt=True)
@click.option('--email', prompt=True)
@click.option('--password', prompt=True, hide_input=True, confirmation_prompt=True)
def create_admin(name, email, password):
    """Provision an admin through a trusted terminal, never public registration."""
    if not name.strip() or len(password) < 12 or len(password) > 128:
        raise click.BadParameter('Enter a name and a password of 12–128 characters.')
    email = email.strip().lower()
    if db.session.scalar(db.select(User).filter_by(email=email)):
        raise click.UsageError('An account with this email already exists.')
    user = User(name=name.strip(), email=email, role='admin')
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    print(f'Administrator provisioned: {email}')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
