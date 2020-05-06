# ~/.bashrc: executed by bash(1) for non-login shells.
# see /usr/share/doc/bash/examples/startup-files (in the package bash-doc)
# for examples

# If not running interactively, don't do anything
case $- in
    *i*) ;;
      *) return;;
esac

# don't put duplicate lines or lines starting with space in the history.
# See bash(1) for more options
HISTCONTROL=ignoreboth

# append to the history file, don't overwrite it
shopt -s histappend

# for setting history length see HISTSIZE and HISTFILESIZE in bash(1)
HISTSIZE=1000
HISTFILESIZE=2000

# check the window size after each command and, if necessary,
# update the values of LINES and COLUMNS.
shopt -s checkwinsize

# If set, the pattern "**" used in a pathname expansion context will
# match all files and zero or more directories and subdirectories.
#shopt -s globstar

# make less more friendly for non-text input files, see lesspipe(1)
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

# set variable identifying the chroot you work in (used in the prompt below)
if [ -z "${debian_chroot:-}" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=$(cat /etc/debian_chroot)
fi

# set a fancy prompt (non-color, unless we know we "want" color)
case "$TERM" in
    xterm-color|*-256color) color_prompt=yes;;
esac

# uncomment for a colored prompt, if the terminal has the capability; turned
# off by default to not distract the user: the focus in a terminal window
# should be on the output of commands, not on the prompt
#force_color_prompt=yes

if [ -n "$force_color_prompt" ]; then
    if [ -x /usr/bin/tput ] && tput setaf 1 >&/dev/null; then
	# We have color support; assume it's compliant with Ecma-48
	# (ISO/IEC-6429). (Lack of such support is extremely rare, and such
	# a case would tend to support setf rather than setaf.)
	color_prompt=yes
    else
	color_prompt=
    fi
fi

if [ "$color_prompt" = yes ]; then
    PS1='${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
else
    PS1='${debian_chroot:+($debian_chroot)}\u@\h:\w\$ '
fi
unset color_prompt force_color_prompt

# If this is an xterm set the title to user@host:dir
case "$TERM" in
xterm*|rxvt*)
    PS1="\[\e]0;${debian_chroot:+($debian_chroot)}\u@\h: \w\a\]$PS1"
    ;;
*)
    ;;
esac

# enable color support of ls and also add handy aliases
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    #alias dir='dir --color=auto'
    #alias vdir='vdir --color=auto'

    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# colored GCC warnings and errors
#export GCC_COLORS='error=01;31:warning=01;35:note=01;36:caret=01;32:locus=01:quote=01'

# some more ls aliases
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Add an "alert" alias for long running commands.  Use like so:
#   sleep 10; alert
alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e '\''s/^\s*[0-9]\+\s*//;s/[;&|]\s*alert$//'\'')"'

# Alias definitions.
# You may want to put all your additions into a separate file like
# ~/.bash_aliases, instead of adding them here directly.
# See /usr/share/doc/bash-doc/examples in the bash-doc package.

if [ -f ~/.bash_aliases ]; then
    . ~/.bash_aliases
fi

# enable programmable completion features (you don't need to enable
# this, if it's already enabled in /etc/bash.bashrc and /etc/profile
# sources /etc/bash.bashrc).
if ! shopt -oq posix; then
  if [ -f /usr/share/bash-completion/bash_completion ]; then
    . /usr/share/bash-completion/bash_completion
  elif [ -f /etc/bash_completion ]; then
    . /etc/bash_completion
  fi
fi

### Above are Ubuntu defaults, which I like.
### Moved from ~/.profile Ubuntu defaults:

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi

### Below it's what I've added.

dcleanup() {
  docker rm -v $(docker ps --filter status=exited -q 2>/dev/null) 2>/dev/null
  docker rmi $(docker images --filter dangling=true -q 2>/dev/null) 2>/dev/null
}

install_deb_from_url() {
  TEMP_DEB=$(mktemp);
  wget -O "$TEMP_DEB" "$1";
  dpkg --skip-same-version -i "$TEMP_DEB";
  apt --fix-broken -y install
}

GOROOT=~/.goroot
GOPATH=~/go
if [ -d $GOROOT ]; then
  export GOROOT
  export GOPATH
  export PATH=$GOPATH/bin:$GOROOT/bin:$PATH
fi

if command -v powerline-go > /dev/null; then
  function _update_ps1() {
    # All default modules but hg because it gets extremely slow in Great Lakes and I don't use it.
    # It's probably due to https://stackoverflow.com/a/3562651/1165181
    PS1="$(powerline-go -modules "venv,user,host,ssh,cwd,perms,git,jobs,exit,root" -newline -error $?)"
  }

  if [[ $TERM != linux && ! $PROMPT_COMMAND =~ _update_ps1 ]]; then
    PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
  fi
elif command -v powerline-shell > /dev/null; then
  function _update_ps1() {
    PS1="$(powerline-shell $?)"
  }

  if [[ $TERM != linux && ! $PROMPT_COMMAND =~ _update_ps1 ]]; then
    PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
  fi
fi

PYENV_PATH=~/.pyenv
if [ -d $PYENV_PATH ]; then
  export PATH=$PYENV_PATH/bin:$PATH
  eval "$(pyenv init -)"
  eval "$(pyenv virtualenv-init -)"

  export PYENV_VIRTUALENV_DISABLE_PROMPT=1

  # So pipenv accepts to operate (e.g., install) within a pyenv loaded virtualenv.
  export PIPENV_IGNORE_VIRTUALENVS=0

  # See https://github.com/pyenv/pyenv/issues/688
  export GIT_INTERNAL_GETTEXT_TEST_FALLBACKS=1
fi

POETRY_PATH=~/.poetry
if [ -d $POETRY_PATH ]; then
  export PATH=$POETRY_PATH/bin:$PATH
fi

ANDROID_SDK_PATH=~/Android/Sdk
if [ -d $ANDROID_SDK_PATH ]; then
  export ANDROID_SDK_PATH
  export PATH=$ANDROID_SDK_PATH/platform-tools:$ANDROID_SDK_PATH/tools/bin:$PATH
fi

CUDA_HOME=/usr/local/cuda
if [ -d $CUDA_HOME ]; then
  export CUDA_HOME
  export PATH=$CUDA_HOME/bin:$PATH
fi

export CUDA_DEVICE_ORDER=PCI_BUS_ID

export KAGGLE_USERNAME=bryant1410

RVM_PATH=~/.rvm
if [ -d $RVM_PATH ]; then
  source "$RVM_PATH/scripts/rvm" # Load RVM into a shell session *as a function*
  export PATH="$PATH:$RVM_PATH/bin"
fi

NVM_PATH=$HOME/.nvm
if [ -d $NVM_PATH ]; then
  export NVM_PATH
  # Use --no-use so bash starts faster.
  . "$NVM_PATH/nvm.sh" --no-use
  . "$NVM_PATH/bash_completion"
fi

NPM_GLOBAL_PATH=~/.npm-global
if [ -d $NPM_GLOBAL_PATH ]; then
  export PATH=$NPM_GLOBAL_PATH/bin:$PATH
fi

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

SDKMAN_DIR="/home/sacastro/.sdkman"
if [ -d $SDKMAN_DIR ]; then
  export SDKMAN_DIR
  [[ -s "/home/sacastro/.sdkman/bin/sdkman-init.sh" ]] && source "/home/sacastro/.sdkman/bin/sdkman-init.sh"
fi

BASHRC_LOCAL=~/.bashrc.local
if [ -f $BASHRC_LOCAL ]; then
  . $BASHRC_LOCAL
fi
