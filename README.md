# Santiago's dotfiles

These are my dotfiles.

It uses [dotbot](https://github.com/anishathalye/dotbot).

## Installation

First check the existing dotfiles in the system home directory, and delete them manually. Then:.

```bash
./install
```

## Installation in a new computer or empty user, from the home directory run:

```bash
mkdir repos
cd repos
git clone https://github.com/bryant1410/dotfiles
cd dotfiles
./install
```

## Some comments

I save the git config in a 2nd user-specific path, so I can override stuff in the local machine, such as the email. 
