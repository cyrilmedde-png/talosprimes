#!/bin/bash
# Script rapide pour passer en SSH et pousser

echo "🔧 Changement du remote vers SSH..."
git remote set-url origin git@github.com:cyrimedde-png/talosprimes.git

echo "✅ Remote changé !"
echo ""
echo "📡 Vérification du remote :"
git remote -v

echo ""
echo "🚀 Pousser sur GitHub..."
git push -u origin main

