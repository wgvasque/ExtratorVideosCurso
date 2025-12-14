import os
import json
import unittest
from extrator_videos.prompt_manager import load, save, validate, edit_section, add_component, remove_component, toggle_component, set_params, snapshot_version, revert_to, record_performance

class TestPromptManager(unittest.TestCase):
    def setUp(self):
        self.path = "prompt_padrao.json"
        self.versions = "extrator_videos/prompt_versions"
        with open(self.path, "r", encoding="utf-8") as f:
            self.data = json.load(f)

    def test_validate_and_save(self):
        validate(self.data)
        save(self.data, self.path)
        d = load(self.path)
        self.assertIn("metadata", d)

    def test_edit_and_components(self):
        d = edit_section(self.data, "contexto", "Novo contexto")
        self.assertEqual(d["estrutura"]["contexto"], "Novo contexto")
        d = add_component(d, {"id": "extra", "descricao": "comp", "conteudo": "X", "ativo": True})
        d = toggle_component(d, "extra", False)
        d = remove_component(d, "extra")
        self.assertTrue(all(c.get("id") != "extra" for c in d["componentes"]))

    def test_params_and_versions(self):
        d = set_params(self.data, temperatura=0.3, max_tokens=1024)
        self.assertEqual(d["parametros"]["temperatura"], 0.3)
        self.assertEqual(d["parametros"]["max_tokens"], 1024)
        d = snapshot_version(d, "ajuste", self.versions)
        self.assertTrue(os.path.exists(os.path.join(self.versions, f"versao_{d['metadata']['versao']}.json")))
        d2 = revert_to(self.path, self.versions, d["metadata"]["versao"])
        self.assertIn("historico", d2)

    def test_performance_record(self):
        d = record_performance(self.data, self.data["metadata"]["versao"], {"tempo_ms": 100, "utilidade": 0.9}, "ok")
        self.assertTrue(len(d["desempenho"]) >= 1)

if __name__ == "__main__":
    unittest.main()
